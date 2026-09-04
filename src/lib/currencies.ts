export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "NZD", symbol: "$", name: "New Zealand Dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "SGD", symbol: "$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "$", name: "Hong Kong Dollar" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "ARS", symbol: "$", name: "Argentine Peso" },
  { code: "CLP", symbol: "$", name: "Chilean Peso" },
];

// Indicative EUR rates used only as an offline fallback.
export const FALLBACK_RATES_TO_EUR: Record<string, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.05,
  JPY: 0.0061,
  CNY: 0.127,
  CAD: 0.67,
  AUD: 0.61,
  NZD: 0.56,
  SEK: 0.087,
  NOK: 0.085,
  DKK: 0.134,
  PLN: 0.23,
  CZK: 0.04,
  HUF: 0.0025,
  RON: 0.2,
  TRY: 0.028,
  BRL: 0.17,
  MXN: 0.048,
  INR: 0.011,
  KRW: 0.00068,
  SGD: 0.69,
  HKD: 0.118,
  THB: 0.026,
  IDR: 0.000057,
  AED: 0.25,
  ILS: 0.25,
  ZAR: 0.05,
  ARS: 0.0009,
  CLP: 0.00098,
};

export function getCurrencyInfo(code: string): CurrencyInfo {
  return (
    CURRENCIES.find((c) => c.code === code) ?? {
      code,
      symbol: code,
      name: code,
    }
  );
}

export function getCurrencyDisplayName(code: string, locale = "en-GB"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
  } catch {
    return getCurrencyInfo(code).name;
  }
}

export function formatMoney(
  amount: number,
  currency: string,
  locale = "en-GB"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${getCurrencyInfo(currency).symbol}`;
  }
}

export function formatMoneyCompact(
  amount: number,
  currency: string,
  locale = "en-GB"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${getCurrencyInfo(currency).symbol}`;
  }
}

/** Compact formatting for chart axes (for example, €1,200 → €1.2K). */
export function formatMoneyAxis(
  amount: number,
  currency: string,
  locale = "en-GB"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatMoneyCompact(amount, currency, locale);
  }
}
