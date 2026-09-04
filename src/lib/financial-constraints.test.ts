import { describe, expect, it } from "vitest";
import {
  calculateBaseAmount,
  calculateReconciliationDifference,
  MAX_DERIVED_MONEY_AMOUNT,
  MAX_MONEY_AMOUNT,
  normalizeExchangeRate,
  normalizeMoneyAmount,
  normalizePositiveMoneyAmount,
  normalizeSupportedCurrency,
  roundMoney,
} from "./financial-constraints";

describe("financial constraints", () => {
  it("normalizes only supported currencies", () => {
    expect(normalizeSupportedCurrency(" eur ")).toBe("EUR");
    expect(normalizeSupportedCurrency("ZZZ")).toBeNull();
    expect(normalizeSupportedCurrency(123)).toBeNull();
  });

  it("rounds positive and negative amounts symmetrically to cents", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(normalizeMoneyAmount(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("rejects positive values that round to zero or exceed storage", () => {
    expect(normalizePositiveMoneyAmount(0.001)).toBeNull();
    expect(normalizePositiveMoneyAmount(MAX_MONEY_AMOUNT)).toBe(
      MAX_MONEY_AMOUNT
    );
    expect(normalizePositiveMoneyAmount(MAX_MONEY_AMOUNT + 0.01)).toBeNull();
  });

  it("normalizes exchange rates to the database's eight decimals", () => {
    expect(normalizeExchangeRate(1.234567895)).toBe(1.2345679);
    expect(normalizeExchangeRate(0)).toBeNull();
    expect(normalizeExchangeRate(Number.NaN)).toBeNull();
  });

  it("detects conversion overflow before database writes", () => {
    expect(calculateBaseAmount(MAX_MONEY_AMOUNT, 5)).toBe(
      4_999_999_999_999.95
    );
    expect(calculateBaseAmount(MAX_MONEY_AMOUNT, 10)).toBeNull();
    expect(calculateBaseAmount(MAX_DERIVED_MONEY_AMOUNT, 1)).toBeNull();
  });

  it("represents the full delta between valid account balances", () => {
    expect(
      calculateReconciliationDifference(
        MAX_MONEY_AMOUNT,
        -MAX_MONEY_AMOUNT
      )
    ).toBe(1_999_999_999_999.98);
  });
});
