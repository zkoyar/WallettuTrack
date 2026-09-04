export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ---------------------------------------------------------------- constants

export const MONTHS_EN_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTHS_EN_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Sun→Sat, index = getUTCDay() */
export const WEEKDAYS_EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MS_DAY = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------------ base

/** Converts a Date to its YYYY-MM-DD representation using UTC components. */
export function toDateString(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Interprets YYYY-MM-DD as midnight UTC to avoid timezone shifts. */
export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function todayString(now = new Date()): string {
  return toDateString(now);
}

// ---------------------------------------------------------------- arithmetic

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDaysIso(fromIso: string, toIso: string): number {
  return Math.round(
    (parseDateOnly(toIso).getTime() - parseDateOnly(fromIso).getTime()) / MS_DAY
  );
}

export function monthKey(dateIso: string | Date): string {
  return typeof dateIso === "string"
    ? dateIso.slice(0, 7)
    : dateIso.toISOString().slice(0, 7);
}

export function startOfMonthIso(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function endOfMonthIso(iso: string): string {
  const d = parseDateOnly(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

/**
 * Inclusive UTC interval expressed with an exclusive upper bound.
 * Suitable for Prisma queries on dates normalized to midnight UTC.
 */
export function inclusiveDateRangeUtc(
  fromIso: string,
  toIso: string
): { gte: Date; lt: Date } {
  return {
    gte: parseDateOnly(fromIso),
    lt: parseDateOnly(addDaysIso(toIso, 1)),
  };
}

// -------------------------------------------------------------- formatting

export function formatDisplayDate(
  value: string | Date,
  locale = "en-GB"
): string {
  const date =
    typeof value === "string" ? parseDateOnly(value.slice(0, 10)) : value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Compact DD/MM format for tables and charts. */
export function formatDayMonth(iso: string, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(parseDateOnly(iso.slice(0, 10)));
}

export function monthLabel(year: number, monthIndex: number): string {
  return `${MONTHS_EN_LONG[monthIndex]} ${year}`;
}

// ------------------------------------------------------------------ math

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}
