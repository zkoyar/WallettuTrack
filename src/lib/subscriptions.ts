import "server-only";

import { db } from "@/lib/db";
import {
  detectSubscriptionCandidates,
  normalizeSubscriptionDescription,
} from "@/lib/subscription-detection";

export async function getDetectedSubscriptions(userId: string, accountId: string) {
  const since = new Date();
  since.setUTCFullYear(since.getUTCFullYear() - 3);

  const [transactions, recurrenceRules] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        accountId,
        type: "EXPENSE",
        transferGroupId: null,
        description: { not: null },
        date: { gte: since },
      },
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        currency: true,
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.recurrenceRule.findMany({
      where: { userId, accountId, active: true, description: { not: null } },
      select: { description: true },
    }),
  ]);

  const tracked = new Set(
    recurrenceRules
      .map((rule) => normalizeSubscriptionDescription(rule.description ?? ""))
      .filter(Boolean)
  );
  return detectSubscriptionCandidates(
    transactions.map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount),
    }))
  ).map((candidate) => ({
    ...candidate,
    alreadyTracked: tracked.has(candidate.normalizedDescription),
  }));
}
