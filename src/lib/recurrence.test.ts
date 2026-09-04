import { describe, expect, it } from "vitest";
import { describeRecurrence, occurrences, parseDaysOfWeek } from "@/lib/recurrence";
import type { RuleLike } from "@/lib/recurrence";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rule(partial: Omit<Partial<RuleLike>, "startDate" | "endDate"> & {
  startDate: string;
  endDate?: string;
}): RuleLike {
  const { startDate, endDate, ...rest } = partial;
  return {
    frequency: "MONTHLY",
    interval: 1,
    daysOfWeek: null,
    dayOfMonth: null,
    monthOfYear: null,
    startDate: new Date(startDate + "T00:00:00Z"),
    endDate: endDate ? new Date(endDate + "T00:00:00Z") : null,
    ...rest,
  };
}

function collect(r: RuleLike, untilIso?: string): string[] {
  const until = untilIso ? new Date(untilIso + "T00:00:00Z") : null;
  const out: string[] = [];
  for (const d of occurrences(r, until)) out.push(iso(d));
  return out;
}

describe("parseDaysOfWeek", () => {
  it("parses an index list", () => {
    expect([...parseDaysOfWeek("1,3,5")].sort()).toEqual([1, 3, 5]);
  });

  it("ignores out-of-range values", () => {
    expect([...parseDaysOfWeek("0,9,7")].sort()).toEqual([0]);
  });

  it("returns an empty set when absent", () => {
    expect(parseDaysOfWeek(null).size).toBe(0);
  });
});

describe("occurrences DAILY", () => {
  it("every day", () => {
    expect(
      collect(rule({ frequency: "DAILY", startDate: "2026-01-01" }), "2026-01-03")
    ).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });

  it("every two days", () => {
    expect(
      collect(
        rule({ frequency: "DAILY", interval: 2, startDate: "2026-01-01" }),
        "2026-01-05"
      )
    ).toEqual(["2026-01-01", "2026-01-03", "2026-01-05"]);
  });

  it("emits nothing when endDate precedes startDate", () => {
    expect(
      collect(
        rule({
          frequency: "DAILY",
          startDate: "2026-01-10",
          endDate: "2026-01-01",
        }),
        "2026-01-20"
      )
    ).toEqual([]);
  });
});

describe("occurrences WEEKLY", () => {
  it("uses the starting weekday", () => {
    // 2026-01-07 is Wednesday.
    expect(
      collect(
        rule({ frequency: "WEEKLY", startDate: "2026-01-07" }),
        "2026-01-21"
      )
    ).toEqual(["2026-01-07", "2026-01-14", "2026-01-21"]);
  });

  it("uses selected days (Mon and Fri)", () => {
    // 2026-01-07 is Wednesday. The generator starts at startDate, so Monday
    // 5 January, before the starting date, is not emitted.
    expect(
      collect(
        rule({ frequency: "WEEKLY", daysOfWeek: "1,5", startDate: "2026-01-07" }),
        "2026-01-16"
      )
    ).toEqual(["2026-01-09", "2026-01-12", "2026-01-16"]);
  });

  it("every two weeks (interval 2)", () => {
    // Start on Wednesday 7 January with interval 2 → 7/1, 21/1, 4/2.
    expect(
      collect(
        rule({ frequency: "WEEKLY", interval: 2, startDate: "2026-01-07" }),
        "2026-02-15"
      )
    ).toEqual(["2026-01-07", "2026-01-21", "2026-02-04"]);
  });
});

describe("occurrences MONTHLY", () => {
  it("same day every month", () => {
    expect(
      collect(
        rule({ frequency: "MONTHLY", dayOfMonth: 15, startDate: "2026-01-01" }),
        "2026-04-30"
      )
    ).toEqual(["2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15"]);
  });

  it("clamps day 31 in shorter months", () => {
    expect(
      collect(
        rule({ frequency: "MONTHLY", dayOfMonth: 31, startDate: "2026-01-01" }),
        "2026-04-30"
      )
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("every three months", () => {
    expect(
      collect(
        rule({
          frequency: "MONTHLY",
          interval: 3,
          dayOfMonth: 1,
          startDate: "2026-01-01",
        }),
        "2026-12-31"
      )
    ).toEqual(["2026-01-01", "2026-04-01", "2026-07-01", "2026-10-01"]);
  });

  it("crosses a year boundary", () => {
    expect(
      collect(
        rule({ frequency: "MONTHLY", dayOfMonth: 30, startDate: "2025-11-01" }),
        "2026-02-28"
      )
    ).toEqual(["2025-11-30", "2025-12-30", "2026-01-30", "2026-02-28"]);
  });
});

describe("occurrences YEARLY", () => {
  it("yearly anniversary", () => {
    expect(
      collect(
        rule({
          frequency: "YEARLY",
          dayOfMonth: 12,
          monthOfYear: 6,
          startDate: "2025-06-12",
        }),
        "2027-12-31"
      )
    ).toEqual(["2025-06-12", "2026-06-12", "2027-06-12"]);
  });

  it("clamps February 29 in non-leap years", () => {
    expect(
      collect(
        rule({
          frequency: "YEARLY",
          dayOfMonth: 29,
          monthOfYear: 2,
          startDate: "2024-02-29",
        }),
        "2028-12-31"
      )
    ).toEqual(["2024-02-29", "2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  });

  it("every two years", () => {
    expect(
      collect(
        rule({
          frequency: "YEARLY",
          interval: 2,
          dayOfMonth: 1,
          monthOfYear: 1,
          startDate: "2025-01-01",
        }),
        "2030-12-31"
      )
    ).toEqual(["2025-01-01", "2027-01-01", "2029-01-01"]);
  });
});

describe("describeRecurrence", () => {
  it("English daily description", () => {
    expect(describeRecurrence({ frequency: "DAILY", interval: 1 })).toBe("Every day");
    expect(describeRecurrence({ frequency: "DAILY", interval: 3 })).toBe("Every 3 days");
  });

  it("English weekly description with weekdays", () => {
    expect(
      describeRecurrence({ frequency: "WEEKLY", interval: 1, daysOfWeek: "1,3" })
    ).toBe("Weekly (Mon, Wed)");
  });

  it("English monthly description", () => {
    expect(
      describeRecurrence({ frequency: "MONTHLY", interval: 1, dayOfMonth: 27 })
    ).toBe("Day 27 of each month");
  });

  it("English yearly description", () => {
    expect(
      describeRecurrence({
        frequency: "YEARLY",
        interval: 1,
        dayOfMonth: 25,
        monthOfYear: 12,
      })
    ).toBe("Yearly on Dec 25");
  });
});
