import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  MAX_DERIVED_MONEY_AMOUNT,
  normalizeMoneyAmount,
} from "@/lib/financial-constraints";

type AccountReader = Pick<Prisma.TransactionClient, "account">;
type BalanceWriter = Pick<Prisma.TransactionClient, "account" | "user">;

export class ConsolidatedBalanceRangeError extends RangeError {
  constructor() {
    super("The consolidated balance exceeds the supported range");
    this.name = "ConsolidatedBalanceRangeError";
  }
}

/** Sums declared account balances, the single source of the consolidated balance. */
export async function getAccountsBalance(
  userId: string,
  client: AccountReader = db
): Promise<number> {
  const result = await client.account.aggregate({
    where: { userId },
    _sum: { currentBalance: true },
  });
  const total = normalizeMoneyAmount(
    Number(result._sum.currentBalance ?? 0),
    MAX_DERIVED_MONEY_AMOUNT
  );
  if (total === null) throw new ConsolidatedBalanceRangeError();
  return total;
}

/** Keeps the legacy User.currentBalance field as a compatible copy. */
export async function syncUserBalance(
  userId: string,
  client: BalanceWriter
): Promise<number> {
  const total = await getAccountsBalance(userId, client);
  await client.user.update({
    where: { id: userId },
    data: { currentBalance: total },
  });
  return total;
}

/**
 * The base currency can change without reinterpreting historical data only when
 * no financial amounts or plans exist yet.
 */
export async function isBaseCurrencyLocked(userId: string): Promise<boolean> {
  const [transactions, recurrences, events, budgets, goals, balance] =
    await Promise.all([
      db.transaction.count({ where: { userId } }),
      db.recurrenceRule.count({ where: { userId } }),
      db.plannedEvent.count({ where: { userId } }),
      db.budget.count({ where: { userId } }),
      db.goal.count({ where: { userId } }),
      getAccountsBalance(userId),
    ]);

  return (
    transactions > 0 ||
    recurrences > 0 ||
    events > 0 ||
    budgets > 0 ||
    goals > 0 ||
    balance !== 0
  );
}
