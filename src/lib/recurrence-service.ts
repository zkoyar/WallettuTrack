import { db } from "@/lib/db";
import { occurrences } from "@/lib/recurrence";
import { getStoredConversion } from "@/lib/rates";
import {
  addDaysIso,
  parseDateOnly,
  toDateString,
  todayString,
} from "@/lib/dates";

/**
 * Generates due transactions for every active recurrence rule and converts
 * planned events into transactions when their date arrives.
 *
 * Throttling: the layout calls this function on every navigation. A recent run
 * skips unnecessary database work. Mutations that create or update rules and
 * events pass force=true for immediate, deterministic synchronization.
 */
const THROTTLE_MS = 45_000;
const lastRunAt = new Map<string, number>();

export async function generateDueTransactions(
  userId: string,
  { force = false }: { force?: boolean } = {}
): Promise<number> {
  if (!force) {
    const last = lastRunAt.get(userId) ?? 0;
    if (Date.now() - last < THROTTLE_MS) return 0;
  }
  lastRunAt.set(userId, Date.now());

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true },
    });
    if (!user) return 0;

    let created = await materializeRules(userId, user.baseCurrency);
    created += await materializeEvents(userId, user.baseCurrency);
    return created;
  } catch (e) {
    // Allow a new attempt on the next run.
    lastRunAt.delete(userId);
    throw e;
  }
}

async function materializeRules(
  userId: string,
  baseCurrency: string
): Promise<number> {
  const rules = await db.recurrenceRule.findMany({
    where: { userId, active: true },
  });
  if (rules.length === 0) return 0;

  const todayIso = todayString();
  const today = parseDateOnly(todayIso);
  let created = 0;

  for (const rule of rules) {
    // Disable completed rules.
    if (
      rule.endDate &&
      rule.lastGeneratedDate &&
      toDateString(rule.lastGeneratedDate) >= toDateString(rule.endDate)
    ) {
      await db.recurrenceRule.updateMany({
        where: {
          id: rule.id,
          userId,
          active: true,
          updatedAt: rule.updatedAt,
        },
        data: { active: false },
      });
      continue;
    }

    const fromDate = rule.lastGeneratedDate
      ? parseDateOnly(addDaysIso(toDateString(rule.lastGeneratedDate), 1))
      : null;
    const effectiveStart =
      fromDate && fromDate > rule.startDate ? fromDate : rule.startDate;
    if (effectiveStart > today) continue;

    const amountNum = Number(rule.amount);
    const conversion = await getStoredConversion(
      amountNum,
      rule.currency,
      baseCurrency
    );

    const batch: {
      userId: string;
      accountId: string | null;
      categoryId: string | null;
      type: typeof rule.type;
      amount: number;
      currency: string;
      amountBase: number;
      exchangeRate: number;
      date: Date;
      description: string | null;
      notes: string | null;
      recurrenceRuleId: string;
    }[] = [];
    let last: Date | null = null;

    for (const occ of occurrences({ ...rule }, today)) {
      if (occ < effectiveStart) continue;
      batch.push({
        userId,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: amountNum,
        currency: rule.currency,
        amountBase: conversion.amountBase,
        exchangeRate: conversion.exchangeRate,
        date: parseDateOnly(toDateString(occ)),
        description: rule.description,
        notes: rule.notes,
        recurrenceRuleId: rule.id,
      });
      last = occ;
      if (batch.length >= 500) break;
    }

    if (batch.length > 0 && last) {
      const inserted = await db.$transaction(async (tx) => {
        // This conditional write acts as an optimistic claim on the rule.
        // If another process already advanced or changed it, do not generate
        // transactions from an outdated snapshot.
        const claimed = await tx.recurrenceRule.updateMany({
          where: {
            id: rule.id,
            userId,
            active: true,
            updatedAt: rule.updatedAt,
            lastGeneratedDate: rule.lastGeneratedDate,
          },
          data: {
            lastGeneratedDate: last,
            ...(rule.endDate &&
            toDateString(last) >= toDateString(rule.endDate)
              ? { active: false }
              : {}),
          },
        });
        if (claimed.count === 0) return 0;

        const result = await tx.transaction.createMany({
          data: batch,
          skipDuplicates: true,
        });
        return result.count;
      });
      created += inserted;
    }
  }

  return created;
}

/** Converts due planned events into real transactions. */
async function materializeEvents(
  userId: string,
  baseCurrency: string
): Promise<number> {
  const today = parseDateOnly(todayString());
  const events = await db.plannedEvent.findMany({
    where: {
      userId,
      date: { lte: today },
    },
  });
  if (events.length === 0) return 0;

  let created = 0;
  for (const ev of events) {
    const amountNum = Number(ev.amount);
    const conversion = await getStoredConversion(
      amountNum,
      ev.currency,
      baseCurrency
    );

    const inserted = await db.$transaction(async (tx) => {
      // Consuming the event and creating the movement in one transaction avoids
      // both losing the event and materializing it twice.
      const consumed = await tx.plannedEvent.deleteMany({
        where: {
          id: ev.id,
          userId,
          date: { lte: today },
          updatedAt: ev.updatedAt,
        },
      });
      if (consumed.count === 0) return 0;

      const result = await tx.transaction.createMany({
        data: [
          {
            userId,
            accountId: ev.accountId,
            categoryId: ev.categoryId,
            type: ev.type,
            amount: amountNum,
            currency: ev.currency,
            amountBase: conversion.amountBase,
            exchangeRate: conversion.exchangeRate,
            date: ev.date,
            description: ev.description,
            notes: ev.notes ?? "From a planned event",
            externalId: `event:${ev.id}`,
          },
        ],
        skipDuplicates: true,
      });
      return result.count;
    });
    created += inserted;
  }

  return created;
}
