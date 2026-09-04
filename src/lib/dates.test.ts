import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  diffDaysIso,
  endOfMonthIso,
  formatDayMonth,
  formatDisplayDate,
  inclusiveDateRangeUtc,
  monthKey,
  pad,
  parseDateOnly,
  round2,
  round4,
  startOfMonthIso,
  todayString,
  toDateString,
} from "@/lib/dates";

describe("dates", () => {
  it("pad formats to two digits", () => {
    expect(pad(1)).toBe("01");
    expect(pad(12)).toBe("12");
    expect(pad(0)).toBe("00");
  });

  it("toDateString uses UTC components", () => {
    expect(toDateString(new Date(Date.UTC(2026, 0, 5)))).toBe("2026-01-05");
  });

  it("todayString uses the UTC day even near local midnight", () => {
    expect(todayString(new Date("2026-01-01T23:30:00.000Z"))).toBe("2026-01-01");
  });

  it("parseDateOnly interprets input as midnight UTC", () => {
    const d = parseDateOnly("2026-01-05");
    expect(d.getUTCDate()).toBe(5);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCHours()).toBe(0);
  });

  it("addDaysIso crosses a month boundary", () => {
    expect(addDaysIso("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("addDaysIso crosses a year boundary", () => {
    expect(addDaysIso("2025-12-30", 3)).toBe("2026-01-02");
  });

  it("addDaysIso supports negative days", () => {
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("diffDaysIso returns zero for the same day", () => {
    expect(diffDaysIso("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("diffDaysIso is positive across February", () => {
    expect(diffDaysIso("2026-01-31", "2026-03-01")).toBe(29);
  });

  it("diffDaysIso can be negative", () => {
    expect(diffDaysIso("2026-03-01", "2026-01-31")).toBe(-29);
  });

  it("monthKey from an ISO string", () => {
    expect(monthKey("2026-08-15")).toBe("2026-08");
  });

  it("monthKey from a Date", () => {
    expect(monthKey(new Date(Date.UTC(2026, 7, 15)))).toBe("2026-08");
  });

  it("startOfMonthIso", () => {
    expect(startOfMonthIso("2026-08-15")).toBe("2026-08-01");
  });

  it("endOfMonthIso for leap-year February", () => {
    expect(endOfMonthIso("2024-02-10")).toBe("2024-02-29");
  });

  it("endOfMonthIso for non-leap-year February", () => {
    expect(endOfMonthIso("2026-02-10")).toBe("2026-02-28");
  });

  it("endOfMonthIso for a 30-day month", () => {
    expect(endOfMonthIso("2026-04-15")).toBe("2026-04-30");
  });

  it("inclusiveDateRangeUtc includes the final day and stops at the following midnight", () => {
    const range = inclusiveDateRangeUtc("2026-08-01", "2026-08-27");
    expect(range.gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(range.lt.toISOString()).toBe("2026-08-28T00:00:00.000Z");
  });

  it("formats display dates as DD/MM/YYYY", () => {
    expect(formatDisplayDate("2026-08-26")).toBe("26/08/2026");
  });

  it("formats day and month as DD/MM", () => {
    expect(formatDayMonth("2026-08-26")).toBe("26/08");
  });

  it("round2 corrects floating-point errors", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBeCloseTo(1.01, 10);
  });

  it("round4 uses four decimal places", () => {
    expect(round4(1 / 3)).toBe(0.3333);
  });
});
