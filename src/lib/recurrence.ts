import { MONTHS_EN_SHORT, WEEKDAYS_EN_SHORT } from "@/lib/dates";
export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RuleLike {
  frequency: Frequency;
  interval: number;
  daysOfWeek?: string | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  startDate: Date;
  endDate?: Date | null;
}

/** Fields that determine future transactions materialized from a rule. */
export interface RecurrenceMaterializationShape {
  type: "EXPENSE" | "INCOME";
  categoryId: string | null;
  amount: number;
  currency: string;
  description: string | null;
  notes: string | null;
  frequency: Frequency;
  interval: number;
  daysOfWeek: string | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  startDate: string;
  endDate: string | null;
}

const MATERIALIZATION_FIELDS = [
  "type",
  "categoryId",
  "amount",
  "currency",
  "description",
  "notes",
  "frequency",
  "interval",
  "daysOfWeek",
  "dayOfMonth",
  "monthOfYear",
  "startDate",
  "endDate",
] as const satisfies readonly (keyof RecurrenceMaterializationShape)[];

/** Reports whether a PATCH changes the content or schedule of new installments. */
export function recurrenceMaterializationChanged(
  before: RecurrenceMaterializationShape,
  after: RecurrenceMaterializationShape
): boolean {
  return MATERIALIZATION_FIELDS.some((field) => before[field] !== after[field]);
}

const MS_DAY = 24 * 60 * 60 * 1000;

/** UTC calendar-day index (1970-01-01 = 0). */
function dayIndex(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_DAY);
}

function fromDayIndex(idx: number): Date {
  return new Date(idx * MS_DAY);
}

/** 0 = Sunday … 6 = Saturday. */
function dowOfIndex(idx: number): number {
  return (idx + 4) % 7;
}

function daysInUtcMonth(year: number, monthIdx: number): number {
  return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
}

export function parseDaysOfWeek(raw?: string | null): Set<number> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => n >= 0 && n <= 6)
  );
}

/**
 * Iterates rule occurrences in ascending order from rule.startDate through
 * endDate or `until` (inclusive). All date arithmetic uses UTC to prevent
 * timezone shifts.
 */
export function* occurrences(
  rule: RuleLike,
  until?: Date | null
): Generator<Date> {
  const startIdx = dayIndex(rule.startDate);
  const endIdxRaw = [
    rule.endDate ? dayIndex(rule.endDate) : null,
    until ? dayIndex(until) : null,
  ].filter((v): v is number => v !== null);
  const endIdx = endIdxRaw.length ? Math.min(...endIdxRaw) : null;

  if (endIdx !== null && endIdx < startIdx) return;

  switch (rule.frequency) {
    case "DAILY": {
      const step = Math.max(1, rule.interval);
      for (let i = startIdx; endIdx === null || i <= endIdx; i += step) {
        yield fromDayIndex(i);
      }
      break;
    }
    case "WEEKLY": {
      const dowSet = new Set<number>();
      if (rule.daysOfWeek) {
        for (const part of rule.daysOfWeek.split(",")) {
          const n = Number.parseInt(part.trim(), 10);
          if (n >= 0 && n <= 6) dowSet.add(n);
        }
      }
      if (dowSet.size === 0) dowSet.add(dowOfIndex(startIdx));

      // Monday of the starting week.
      const startDow = dowOfIndex(startIdx);
      const mondayAnchor = startIdx - ((startDow + 6) % 7);

      const step = Math.max(1, rule.interval);
      for (let i = startIdx; endIdx === null || i <= endIdx; i++) {
        if (!dowSet.has(dowOfIndex(i))) continue;
        const weeksFromAnchor = Math.floor((i - mondayAnchor) / 7);
        if (((weeksFromAnchor % step) + step) % step === 0) {
          yield fromDayIndex(i);
        }
      }
      break;
    }
    case "MONTHLY": {
      const dom = rule.dayOfMonth ?? new Date(rule.startDate).getUTCDate();
      const step = Math.max(1, rule.interval);
      const startY = rule.startDate.getUTCFullYear();
      const startM = rule.startDate.getUTCMonth();
      for (let k = 0; k < 1200; k++) {
        const totalMonths = startM + k * step;
        const y = startY + Math.floor(totalMonths / 12);
        const m = ((totalMonths % 12) + 12) % 12;
        const idx = Math.floor(Date.UTC(y, m, Math.min(dom, daysInUtcMonth(y, m))) / MS_DAY);
        if (endIdx !== null && idx > endIdx) break;
        yield fromDayIndex(idx);
      }
      break;
    }
    case "YEARLY": {
      const dom = rule.dayOfMonth ?? new Date(rule.startDate).getUTCDate();
      const moy =
        rule.monthOfYear ?? new Date(rule.startDate).getUTCMonth() + 1;
      const step = Math.max(1, rule.interval);
      let y = rule.startDate.getUTCFullYear();
      // Align with the first applicable year.
      while (
        y < rule.startDate.getUTCFullYear() ||
        (y === rule.startDate.getUTCFullYear() &&
          moy - 1 < rule.startDate.getUTCMonth())
      ) {
        y += step;
      }
      let guard = 0;
      while (guard < 300) {
        const idx = Math.floor(
          Date.UTC(y, moy - 1, Math.min(dom, daysInUtcMonth(y, moy - 1))) / MS_DAY
        );
        if (endIdx !== null && idx > endIdx) break;
        if (idx >= startIdx) yield fromDayIndex(idx);
        y += step;
        guard++;
      }
      break;
    }
  }
}

export function describeRecurrence(rule: {
  frequency: string;
  interval: number;
  daysOfWeek?: string | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
}): string {
  const weekdays = WEEKDAYS_EN_SHORT;
  const months = MONTHS_EN_SHORT;

  switch (rule.frequency) {
    case "DAILY":
      return rule.interval === 1 ? "Every day" : `Every ${rule.interval} days`;
    case "WEEKLY": {
      const dow = [...parseDaysOfWeek(rule.daysOfWeek)].sort();
      const names = dow.map((d) => weekdays[d]).join(", ");
      const prefix =
        rule.interval === 1 ? "Weekly" : `Every ${rule.interval} weeks`;
      return names ? `${prefix} (${names})` : prefix;
    }
    case "MONTHLY":
      return rule.interval === 1
        ? `Day ${rule.dayOfMonth ?? 1} of each month`
        : `Every ${rule.interval} months · day ${rule.dayOfMonth ?? 1}`;
    case "YEARLY":
      return `Yearly on ${months[(rule.monthOfYear ?? 1) - 1]} ${rule.dayOfMonth ?? 1}`;
    default:
      return rule.frequency;
  }
}
