import { db } from "@/lib/db";
import {
  addDaysIso,
  diffDaysIso,
  endOfMonthIso,
  inclusiveDateRangeUtc,
  startOfMonthIso,
  todayString,
} from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { BudgetsClient, type BudgetWithSpent } from "@/components/budgets/budgets-client";
import { getSelectedAccount } from "@/lib/selected-account";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Budget")} · WallettuTrack` };
}


type BudgetPeriod = "WEEKLY" | "MONTHLY" | "YEARLY";

function periodStartIso(period: BudgetPeriod, todayIso: string): string {
  if (period === "MONTHLY") return startOfMonthIso(todayIso);
  if (period === "YEARLY") return todayIso.slice(0, 5) + "01-01";
  // WEEKLY: Monday of the current week in UTC.
  const dow = (new Date(todayIso + "T00:00:00Z").getUTCDay() + 6) % 7;
  return addDaysIso(todayIso, -dow);
}

function periodEndIso(period: BudgetPeriod, todayIso: string): string {
  if (period === "WEEKLY") return addDaysIso(periodStartIso("WEEKLY", todayIso), 6);
  if (period === "MONTHLY") return endOfMonthIso(todayIso);
  return todayIso.slice(0, 5) + "12-31";
}

export default async function BudgetsPage() {
  const user = await requireUser();
  const userId = user.id;
  const account = await getSelectedAccount(userId);
  if (!account) return null;
  const accountId = account.id;
  const todayIso = todayString();

  const [budgets, categories] = await Promise.all([
    db.budget.findMany({
      where: { userId, accountId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  // Spending during each budget's period.
  const byPeriod = new Map<string, string[]>();
  for (const b of budgets) {
    const key = b.period;
    const arr = byPeriod.get(key) ?? [];
    arr.push(b.categoryId);
    byPeriod.set(key, arr);
  }

  const spentByBudget = new Map<string, number>();
  for (const [period, categoryIds] of byPeriod) {
    if (categoryIds.length === 0) continue;
    const startIso = periodStartIso(period as BudgetPeriod, todayIso);
    const grouped = await db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        accountId,
        type: "EXPENSE",
        categoryId: { in: categoryIds },
        date: inclusiveDateRangeUtc(startIso, todayIso),
      },
      _sum: { amountBase: true },
    });
    for (const g of grouped) {
      if (!g.categoryId) continue;
      const budget = budgets.find(
        (b) => b.categoryId === g.categoryId && b.period === period
      );
      if (budget) {
        spentByBudget.set(g.categoryId + ":" + period, Number(g._sum.amountBase ?? 0));
      }
    }
  }

  const items: BudgetWithSpent[] = budgets.map((b) => {
    const spentVal = spentByBudget.get(b.categoryId + ":" + b.period) ?? 0;

    // End-of-period forecast based on the current rate.
    const pStart = periodStartIso(b.period as BudgetPeriod, todayIso);
    const pEnd = periodEndIso(b.period as BudgetPeriod, todayIso);
    const totalDays = Math.max(1, diffDaysIso(pStart, pEnd) + 1);
    let elapsed = diffDaysIso(pStart, todayIso) + 1;
    elapsed = Math.min(totalDays, Math.max(1, elapsed));

    const dailyRate = spentVal / elapsed;
    const projTotal =
      elapsed >= totalDays ? spentVal : Math.round(dailyRate * totalDays * 100) / 100;

    let overrunDate: string | null = null;
    const limit = Number(b.amount);
    if (limit > 0 && dailyRate > limit / totalDays && projTotal > limit) {
      const idx = Math.min(
        totalDays - 1,
        Math.floor(limit / dailyRate)
      );
      const d = new Date(pStart + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + idx + 1); // First day that exceeds the limit.
      overrunDate = d.toISOString().slice(0, 10);
    }

    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      categoryIcon: b.category.icon,
      categoryColor: b.category.color,
      amount: limit,
      spent: spentVal,
      period: b.period as BudgetWithSpent["period"],
      alertThreshold: b.alertThreshold,
      projectedSpent: projTotal,
      overrunDate,
    };
  });

  return (
    <BudgetsClient
      budgets={items}
      baseCurrency={user.baseCurrency}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        type: c.type as "EXPENSE" | "INCOME",
      }))}
      accountName={`${account.icon} ${account.name}`}
    />
  );
}
