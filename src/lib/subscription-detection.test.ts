import { describe, expect, it } from "vitest";
import {
  detectSubscriptionCandidates,
  normalizeSubscriptionDescription,
  type SubscriptionInput,
} from "@/lib/subscription-detection";

function transaction(date: string, amount: number, description = "NETFLIX 123456"): SubscriptionInput {
  return {
    id: `${date}-${amount}`,
    date: new Date(`${date}T00:00:00Z`),
    description,
    amount,
    currency: "EUR",
    category: null,
  };
}

describe("subscription detection", () => {
  it("detects a monthly cadence and price increase", () => {
    const items = detectSubscriptionCandidates(
      [
        transaction("2026-01-10", 10),
        transaction("2026-02-10", 10),
        transaction("2026-03-10", 12),
      ],
      new Date("2026-03-15T00:00:00Z")
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      frequency: "MONTHLY",
      interval: 1,
      occurrences: 3,
      nextDate: "2026-04-10",
      latestAmount: 12,
      priceChangePercent: 20,
    });
  });

  it("detects quarterly payments", () => {
    const items = detectSubscriptionCandidates(
      [
        transaction("2025-09-05", 30, "Cloud Pro"),
        transaction("2025-12-05", 30, "Cloud Pro"),
        transaction("2026-03-05", 30, "Cloud Pro"),
      ],
      new Date("2026-03-10T00:00:00Z")
    );
    expect(items[0]).toMatchObject({ frequency: "MONTHLY", interval: 3 });
  });

  it("discards irregular sequences", () => {
    const items = detectSubscriptionCandidates(
      [
        transaction("2026-01-01", 20, "Acquisto casuale"),
        transaction("2026-01-05", 20, "Acquisto casuale"),
        transaction("2026-03-20", 20, "Acquisto casuale"),
      ],
      new Date("2026-03-21T00:00:00Z")
    );
    expect(items).toHaveLength(0);
  });

  it("normalizes bank prefixes and identifiers", () => {
    expect(normalizeSubscriptionDescription("Pagamento carta NETFLIX 123456"))
      .toBe("netflix");
  });
});
