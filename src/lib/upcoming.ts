import { db } from "@/lib/db";
import { occurrences } from "@/lib/recurrence";
import { getStoredConversion } from "@/lib/rates";
import { parseDateOnly, toDateString } from "@/lib/dates";

export interface UpcomingItem {
  /** ID of the recurrence rule or planned event. */
  id: string;
  source: "rule" | "event";
  type: "EXPENSE" | "INCOME";
  date: string;
  description: string | null;
  amount: number;
  currency: string;
  amountBase: number;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
    type: "EXPENSE" | "INCOME";
  } | null;
}

/**
 * Calculates FUTURE occurrences after today in [fromDate, toDate] by combining:
 * - active recurrence rules
 * - one-off planned events
 * This does not modify the transaction database; the results are projections.
 */
export async function getUpcomingOccurrences(
  userId: string,
  fromDate: string,
  toDate: string,
  accountId?: string
): Promise<UpcomingItem[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  if (!user) return [];

  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  if (to < from) return [];

  const rules = await db.recurrenceRule.findMany({
    where: { userId, active: true, ...(accountId ? { accountId } : {}) },
    include: { category: true },
  });

  const events = await db.plannedEvent.findMany({
    where: {
      userId,
      ...(accountId ? { accountId } : {}),
      date: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: { category: true },
  });

  const items: UpcomingItem[] = [];

  for (const rule of rules) {
    const amountNum = Number(rule.amount);
    const conversion = await getStoredConversion(
      amountNum,
      rule.currency,
      user.baseCurrency
    );

    let guard = 0;
    for (const occ of occurrences({ ...rule }, to)) {
      // Skip the past and anything already materialized.
      if (occ <= from || occ < rule.startDate) continue;

      items.push({
        id: rule.id,
        source: "rule",
        type: rule.type === "INCOME" ? "INCOME" : "EXPENSE",
        date: toDateString(occ),
        description: rule.description,
        amount: amountNum,
        currency: rule.currency,
        amountBase: conversion.amountBase,
        category: mapCategory(rule.category),
      });

      if (++guard >= 366) break;
    }
  }

  for (const ev of events) {
    const d = toDateString(ev.date);
    if (d <= fromDate || d > toDate) continue;

    const amount = Number(ev.amount);
    const conversion = await getStoredConversion(
      amount,
      ev.currency,
      user.baseCurrency
    );

    items.push({
      id: ev.id,
      source: "event",
      type: ev.type === "INCOME" ? "INCOME" : "EXPENSE",
      date: d,
      description: ev.description,
      amount,
      currency: ev.currency,
      amountBase: conversion.amountBase,
      category: mapCategory(ev.category),
    });
  }

  items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.description ?? "").localeCompare(b.description ?? "")
  );

  return items;
}

type CategoryWithFields = {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: string;
} | null;

function mapCategory(c: CategoryWithFields): UpcomingItem["category"] {
  return c
    ? {
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        type: (c.type === "INCOME" ? "INCOME" : "EXPENSE") as
          | "EXPENSE"
          | "INCOME",
      }
    : null;
}
