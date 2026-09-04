import { db } from "@/lib/db";
import { getUpcomingOccurrences } from "@/lib/upcoming";
import {
  addDaysIso,
  endOfMonthIso,
  parseDateOnly,
  round2,
  todayString,
  toDateString,
} from "@/lib/dates";

export interface CashflowPoint {
  date: string;
  balance: number;
  phase: "history" | "today" | "projected";
}

export interface CashflowMovement {
  id: string;
  source: "rule" | "event" | "transaction";
  type: "EXPENSE" | "INCOME";
  date: string;
  description: string | null;
  amountBase: number;
}

export interface CashflowResult {
  currency: string;
  startBalance: number;
  points: CashflowPoint[];
  endOfMonthBalance: number | null;
  minProjected: { date: string; value: number } | null;
  negativeDays: number;
  projectedExpenses90: number;
  projectedIncomes90: number;
  movements: CashflowMovement[];
}


/**
 * Day-by-day balance forecast:
 * recent history anchored to the declared current balance, plus future
 * scenarios from recurring items, planned events, and future-dated transactions.
 */
export async function getCashflowForecast(
  userId: string,
  days = 90,
  accountId?: string
): Promise<CashflowResult | null> {
  const [user, account] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true, currentBalance: true },
    }),
    accountId
      ? db.account.findFirst({
          where: { id: accountId, userId },
          select: { currentBalance: true },
        })
      : db.account.findFirst({
          where: { userId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { currentBalance: true },
        }),
  ]);
  if (!user) return null;

  const currency = user.baseCurrency;
  // The user field remains only as a fallback for legacy users without accounts.
  const startBalance = round2(
    account
      ? Number(account.currentBalance)
      : Number(user.currentBalance)
  );
  const today = todayString();

  const histStart = addDaysIso(today, -44);
  const futureEnd = addDaysIso(today, days);

  const [txs, upcoming] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        ...(accountId ? { accountId } : {}),
        date: { gte: parseDateOnly(histStart) },
      },
      select: { date: true, type: true, amountBase: true, transferGroupId: true },
      orderBy: { date: "asc" },
    }),
    getUpcomingOccurrences(
      userId,
      addDaysIso(today, 1),
      futureEnd,
      accountId
    ),
  ]);

  // Historical daily net through today.
  const histNet = new Map<string, number>();
  let histEarliestNetTotal = 0;
  for (const t of txs) {
    if (t.transferGroupId) continue; // Internal transfers have no net effect.
    const iso = toDateString(t.date);
    if (iso > today) continue;
    const signed =
      t.type === "INCOME" ? Number(t.amountBase) : -Number(t.amountBase);
    histNet.set(iso, (histNet.get(iso) ?? 0) + signed);
    histEarliestNetTotal += signed;
  }

  // Balance at the start of the historical window.
  let bal = round2(startBalance - histEarliestNetTotal);
  const points: CashflowPoint[] = [{ date: histStart, balance: bal, phase: "history" }];

  let cur = histStart;
  while (cur < today) {
    bal = round2(bal + (histNet.get(cur) ?? 0));
    points.push({ date: cur, balance: bal, phase: "history" });
    cur = addDaysIso(cur, 1);
  }
  // Today: exact declared balance.
  points.push({ date: today, balance: startBalance, phase: "today" });

  // Future: projections plus future-dated real transactions.
  const futureNet = new Map<string, number>();
  const movements: CashflowMovement[] = [];
  let projectedExpenses90 = 0;
  let projectedIncomes90 = 0;

  for (const t of txs) {
    if (t.transferGroupId) continue;
    const iso = toDateString(t.date);
    if (iso <= today) continue;
    const signed =
      t.type === "INCOME" ? Number(t.amountBase) : -Number(t.amountBase);
    futureNet.set(iso, (futureNet.get(iso) ?? 0) + signed);
    movements.push({
      id: `tx-${iso}-${signed}`,
      source: "transaction",
      type: t.type === "INCOME" ? "INCOME" : "EXPENSE",
      date: iso,
      description: null,
      amountBase: Number(t.amountBase),
    });
  }

  for (const u of upcoming) {
    const signed =
      u.type === "INCOME" ? u.amountBase : -u.amountBase;
    futureNet.set(u.date, (futureNet.get(u.date) ?? 0) + signed);
    if (u.type === "EXPENSE") projectedExpenses90 += u.amountBase;
    else projectedIncomes90 += u.amountBase;
    movements.push({
      id: `${u.source}-${u.id}-${u.date}`,
      source: u.source,
      type: u.type,
      date: u.date,
      description: u.description,
      amountBase: u.amountBase,
    });
  }

  bal = startBalance;
  let minProjected: { date: string; value: number } | null = null;
  let negativeDays = 0;

  cur = addDaysIso(today, 1);
  while (cur <= futureEnd) {
    bal = round2(bal + (futureNet.get(cur) ?? 0));
    points.push({ date: cur, balance: bal, phase: "projected" });
    if (!minProjected || bal < minProjected.value) {
      minProjected = { date: cur, value: bal };
    }
    if (bal < 0) negativeDays++;
    cur = addDaysIso(cur, 1);
  }

  // Balance at the end of the current month.
  const monthEndIso = endOfMonthIso(today);
  const endOfMonthBalance =
    points.find((p) => p.date === monthEndIso)?.balance ?? null;

  movements.sort(
    (a, b) => a.date.localeCompare(b.date) || b.amountBase - a.amountBase
  );

  return {
    currency,
    startBalance,
    points,
    endOfMonthBalance,
    minProjected,
    negativeDays,
    projectedExpenses90: round2(projectedExpenses90),
    projectedIncomes90: round2(projectedIncomes90),
    movements: movements.slice(0, 15),
  };
}
