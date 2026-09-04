import { describe, expect, it } from "vitest";
import {
  accountUpdateSchema,
  budgetUpdateSchema,
  categoryUpdateSchema,
  currencyCodeSchema,
  recurrenceUpdateSchema,
  transactionSchema,
  transactionUpdateSchema,
} from "./validators";
import { MAX_MONEY_AMOUNT } from "./financial-constraints";

describe("partial update validators", () => {
  it("do not inject create defaults into account updates", () => {
    expect(accountUpdateSchema.parse({ name: "Cash" })).toEqual({ name: "Cash" });
  });

  it("do not inject create defaults into category updates", () => {
    expect(categoryUpdateSchema.parse({ name: "Food" })).toEqual({ name: "Food" });
  });

  it("do not change transaction type when it was omitted", () => {
    expect(transactionUpdateSchema.parse({ notes: "Updated" })).toEqual({
      notes: "Updated",
    });
  });

  it("do not reset recurrence defaults when they were omitted", () => {
    expect(recurrenceUpdateSchema.parse({ amount: 25 })).toEqual({ amount: 25 });
  });

  it("do not reset budget defaults when they were omitted", () => {
    expect(budgetUpdateSchema.parse({ amount: 100 })).toEqual({ amount: 100 });
  });
});

describe("financial validators", () => {
  const transaction = {
    amount: 10,
    currency: "eur",
    date: "2026-09-04",
  };

  it("normalizes currencies and monetary precision", () => {
    const parsed = transactionSchema.parse({ ...transaction, amount: 1.005 });
    expect(parsed.currency).toBe("EUR");
    expect(parsed.amount).toBe(1.01);
  });

  it("rejects unsupported currencies", () => {
    expect(currencyCodeSchema.safeParse("ZZZ").success).toBe(false);
    expect(
      transactionSchema.safeParse({ ...transaction, currency: "ZZZ" }).success
    ).toBe(false);
  });

  it("rejects sub-cent and overflowing amounts", () => {
    expect(
      transactionSchema.safeParse({ ...transaction, amount: 0.001 }).success
    ).toBe(false);
    expect(
      transactionSchema.safeParse({
        ...transaction,
        amount: MAX_MONEY_AMOUNT + 0.01,
      }).success
    ).toBe(false);
  });
});
