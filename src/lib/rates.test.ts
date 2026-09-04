import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { getRateMultiplier, getStoredConversion } from "./rates";
import { MAX_MONEY_AMOUNT } from "./financial-constraints";

describe("stored currency conversions", () => {
  it("normalizes supported same-currency conversions without a rate lookup", async () => {
    await expect(getRateMultiplier(" eur ", "EUR")).resolves.toBe(1);
    await expect(getStoredConversion(1.005, "eur", "EUR")).resolves.toEqual({
      amountBase: 1.01,
      exchangeRate: 1,
    });
  });

  it("rejects unsupported currencies even when the codes match", async () => {
    await expect(getRateMultiplier("ZZZ", "ZZZ")).rejects.toThrow(
      "Unsupported currency"
    );
  });

  it("rejects raw amounts outside their database range", async () => {
    await expect(
      getStoredConversion(MAX_MONEY_AMOUNT + 0.01, "EUR", "EUR")
    ).rejects.toThrow("Converted amount exceeds the supported range");
  });
});
