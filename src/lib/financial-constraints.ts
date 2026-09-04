import { CURRENCIES } from "@/lib/currencies";

/** Maximum absolute value representable by MySQL DECIMAL(14, 2). */
export const MAX_MONEY_AMOUNT = 999_999_999_999.99;
/**
 * Upper bound for derived totals stored as DECIMAL(16, 2).
 *
 * The conservative bound keeps the IEEE-754 spacing below half a cent while
 * amounts pass through the application's number-based API layer.
 */
export const MAX_DERIVED_MONEY_AMOUNT = 9_000_000_000_000;
/** Largest possible delta between two valid DECIMAL(14, 2) balances. */
export const MAX_RECONCILIATION_DIFFERENCE = MAX_MONEY_AMOUNT * 2;
/**
 * Bounds for stored exchange rates. The supported fiat pairs are far below
 * this ceiling; keeping it conservative preserves eight-decimal precision in
 * the application's number-based API layer before writing DECIMAL(18, 8).
 */
export const MIN_EXCHANGE_RATE = 0.00000001;
export const MAX_EXCHANGE_RATE = 1_000_000;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_NOTES_LENGTH = 2_000;
export const MAX_EMAIL_LENGTH = 191;

const supportedCurrencyCodes = new Set(CURRENCIES.map(({ code }) => code));

export function normalizeSupportedCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return supportedCurrencyCodes.has(code) ? code : null;
}

export function isSupportedCurrency(code: string): boolean {
  return supportedCurrencyCodes.has(code.trim().toUpperCase());
}

/** Rounds a finite amount to the two-decimal precision used by the database. */
export function roundMoney(value: number): number {
  const rounded = Math.round(
    (value + Math.sign(value) * Number.EPSILON) * 100
  ) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function normalizeMoneyAmount(
  value: number,
  max = MAX_MONEY_AMOUNT
): number | null {
  if (!Number.isFinite(value)) return null;
  const rounded = roundMoney(value);
  return Math.abs(rounded) <= max ? rounded : null;
}

export function normalizePositiveMoneyAmount(
  value: number,
  max = MAX_MONEY_AMOUNT
): number | null {
  const normalized = normalizeMoneyAmount(value, max);
  return normalized !== null && normalized > 0 ? normalized : null;
}

/** Normalizes a rate to the precision and range of DECIMAL(18, 8). */
export function normalizeExchangeRate(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100_000_000) / 100_000_000;
  return rounded >= MIN_EXCHANGE_RATE && rounded <= MAX_EXCHANGE_RATE
    ? rounded
    : null;
}

/**
 * Converts an amount while guaranteeing that the value remains representable
 * (including cents) in the widened DECIMAL(16, 2) derived-amount columns.
 */
export function calculateBaseAmount(
  amount: number,
  exchangeRate: number
): number | null {
  const normalizedAmount = normalizePositiveMoneyAmount(amount);
  const normalizedRate = normalizeExchangeRate(exchangeRate);
  if (normalizedAmount === null || normalizedRate === null) return null;
  return normalizePositiveMoneyAmount(
    normalizedAmount * normalizedRate,
    MAX_DERIVED_MONEY_AMOUNT
  );
}

export function calculateReconciliationDifference(
  actualBalance: number,
  balanceBefore: number
): number | null {
  const actual = normalizeMoneyAmount(actualBalance);
  const before = normalizeMoneyAmount(balanceBefore);
  if (actual === null || before === null) return null;
  return normalizeMoneyAmount(
    actual - before,
    MAX_RECONCILIATION_DIFFERENCE
  );
}
