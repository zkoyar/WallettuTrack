import { describe, expect, it } from "vitest";
import { backupDate, backupSchema, findDuplicate } from "./backup";
import {
  MAX_DERIVED_MONEY_AMOUNT,
  MAX_MONEY_AMOUNT,
} from "./financial-constraints";

const minimalBackup = {
  schemaVersion: 1,
  exportedAt: "2026-08-26T12:00:00.000Z",
  app: "WallettuTrack",
  user: {
    email: "user@wallettutrack.example",
    name: "User",
    baseCurrency: "eur",
    locale: "en-GB",
    currentBalance: 100,
  },
  accounts: [],
  categories: [],
  categoryRules: [],
  transactions: [],
  recurrenceRules: [],
  plannedEvents: [],
  budgets: [],
  goals: [],
};

describe("backup WallettuTrack", () => {
  it("validates a minimal backup and normalizes the currency", () => {
    const parsed = backupSchema.parse(minimalBackup);
    expect(parsed.user.baseCurrency).toBe("EUR");
  });

  it("rejects a backup from another application", () => {
    expect(() => backupSchema.parse({ ...minimalBackup, app: "Other" })).toThrow();
  });

  it("converts ISO dates using UTC", () => {
    expect(backupDate("2026-08-26")?.toISOString()).toBe(
      "2026-08-26T00:00:00.000Z"
    );
  });

  it("finds duplicate values case-insensitively", () => {
    expect(findDuplicate(["Home", "Travel", "home"])).toBe("home");
    expect(findDuplicate(["Home", "Travel"])).toBeNull();
  });

  it("accepts consistent derived amounts but rejects an inconsistent reconciliation", () => {
    const amountBase = 2.5;
    const valid = backupSchema.parse({
      ...minimalBackup,
      accounts: [
        {
          id: "account-1",
          name: "Main account",
          icon: "bank",
          color: "#123456",
          currentBalance: 100,
        },
      ],
      transactions: [
        {
          type: "EXPENSE",
          amount: 2,
          amountBase,
          exchangeRate: 1.25,
          currency: "EUR",
          accountId: "account-1",
          date: "2026-09-04",
        },
      ],
      reconciliations: [
        {
          id: "reconciliation-1",
          accountId: "account-1",
          balanceBefore: -MAX_MONEY_AMOUNT,
          actualBalance: MAX_MONEY_AMOUNT,
          difference: MAX_MONEY_AMOUNT * 2,
          reconciledAt: "2026-09-04",
        },
      ],
    });
    expect(valid.transactions[0].amountBase).toBe(amountBase);

    expect(() =>
      backupSchema.parse({
        ...minimalBackup,
        accounts: [
          {
            id: "account-1",
            name: "Main account",
            icon: "bank",
            color: "#123456",
            currentBalance: 100,
          },
        ],
        reconciliations: [
          {
            id: "reconciliation-1",
            accountId: "account-1",
            balanceBefore: 10,
            actualBalance: 20,
            difference: 9,
            reconciledAt: "2026-09-04",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects inconsistent conversions, dangling references, and duplicate source ids", () => {
    expect(() =>
      backupSchema.parse({
        ...minimalBackup,
        accounts: [
          {
            id: "account-1",
            name: "Cash",
            icon: "cash",
            color: "#123456",
            currentBalance: 0,
          },
          {
            id: "account-1",
            name: "Bank",
            icon: "bank",
            color: "#654321",
            currentBalance: 0,
          },
        ],
        transactions: [
          {
            type: "EXPENSE",
            amount: 10,
            amountBase: 99,
            exchangeRate: 1,
            currency: "EUR",
            accountId: "missing-account",
            date: "2026-09-04",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects a consolidated fallback that cannot fit in an account", () => {
    expect(() =>
      backupSchema.parse({
        ...minimalBackup,
        user: {
          ...minimalBackup.user,
          currentBalance: MAX_DERIVED_MONEY_AMOUNT,
        },
      })
    ).toThrow();
  });
});
