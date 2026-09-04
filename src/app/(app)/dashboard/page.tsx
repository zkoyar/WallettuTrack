import Link from "next/link";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  PiggyBankIcon,
  TrendingUpIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney, formatMoneyCompact } from "@/lib/currencies";
import {
  addDaysIso,
  endOfMonthIso,
  formatDayMonth,
  formatDisplayDate,
  inclusiveDateRangeUtc,
  startOfMonthIso,
  todayString,
} from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getUpcomingOccurrences } from "@/lib/upcoming";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getSelectedAccount } from "@/lib/selected-account";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";
import { getIntlLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Dashboard")} · WallettuTrack` };
}

import {
  MonthlyBarChart,
  type MonthlyBarDatum,
} from "@/components/charts/monthly-bar-chart";
import {
  CategoryPieChart,
  CategoryLegend,
  type PieDatum,
} from "@/components/charts/category-pie-chart";

function mondayOfWeek(iso: string): string {
  const dow = (new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7; // Mon = 0.
  return addDaysIso(iso, -dow);
}

export default async function DashboardPage() {
  const { locale, t } = await getServerI18n();
  const tr = t;
  const intlLocale = getIntlLocale(locale);
  const user = await requireUser();
  const userId = user.id;
  const currency = user.baseCurrency;
  const account = await getSelectedAccount(userId);
  if (!account) return null;
  const accountId = account.id;

  const todayStr = todayString();
  const monthStartStr = startOfMonthIso(todayStr);

  const todayDate = new Date(todayStr + "T00:00:00Z");
  const weekStartStr = mondayOfWeek(todayStr);
  const sixMonthsAgo = new Date(
    Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() - 5, 1)
  )
    .toISOString()
    .slice(0, 10);
  const todayRange = inclusiveDateRangeUtc(todayStr, todayStr);
  const weekToDateRange = inclusiveDateRangeUtc(weekStartStr, todayStr);
  const monthToDateRange = inclusiveDateRangeUtc(monthStartStr, todayStr);
  const seriesToDateRange = inclusiveDateRangeUtc(sixMonthsAgo, todayStr);

  // Load recurring items due in the next 30 days alongside the main queries.
  const upcomingPromise = getUpcomingOccurrences(
    userId,
    todayStr,
    addDaysIso(todayStr, 30),
    accountId
  );

  const [todayAgg, weekAgg, monthExp, monthInc, seriesTx, monthTxByCat, recent, budgets] =
    await Promise.all([
      db.transaction.aggregate({
        where: { userId, accountId, type: "EXPENSE", transferGroupId: null, date: todayRange },
        _sum: { amountBase: true },
      }),
      db.transaction.aggregate({
        where: {
          userId,
          accountId,
          type: "EXPENSE",
          transferGroupId: null,
          date: weekToDateRange,
        },
        _sum: { amountBase: true },
      }),
      db.transaction.aggregate({
        where: {
          userId,
          accountId,
          type: "EXPENSE",
          transferGroupId: null,
          date: monthToDateRange,
        },
        _sum: { amountBase: true },
      }),
      db.transaction.aggregate({
        where: {
          userId,
          accountId,
          type: "INCOME",
          transferGroupId: null,
          date: monthToDateRange,
        },
        _sum: { amountBase: true },
      }),
      db.transaction.findMany({
        where: {
          userId,
          accountId,
          transferGroupId: null,
          date: seriesToDateRange,
        },
        select: { type: true, amountBase: true, date: true },
      }),
      db.transaction.findMany({
        where: {
          userId,
          accountId,
          type: "EXPENSE",
          transferGroupId: null,
          date: monthToDateRange,
        },
        select: { amountBase: true, categoryId: true },
      }),
      db.transaction.findMany({
        where: { userId, accountId, date: { lt: todayRange.lt } },
        include: { category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 8,
      }),
      db.budget.findMany({
        where: { userId, accountId, period: "MONTHLY" },
        include: { category: true },
      }),
    ]);

  // Second parallel batch: categories, monthly budget spending, and forecasts.
  const upcomingItems = await upcomingPromise;
  const [categories, budgetSpent] = await Promise.all([
    db.category.findMany({ where: { userId } }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        accountId,
        type: "EXPENSE",
        categoryId: { in: budgets.map((b) => b.categoryId) },
        date: monthToDateRange,
      },
      _sum: { amountBase: true },
    }),
  ]);
  const upcomingOut = upcomingItems
    .filter((u) => u.type === "EXPENSE")
    .reduce((s, u) => s + u.amountBase, 0);

  // Forecast expenses through the end of the current month.
  const monthEndIso = endOfMonthIso(todayStr);
  const monthPrevOut = upcomingItems
    .filter((u) => u.type === "EXPENSE" && u.date <= monthEndIso)
    .reduce((s, u) => s + u.amountBase, 0);

  // Monthly series for the last six months.
  const monthlyMap = new Map<string, MonthlyBarDatum>();
  for (let k = 5; k >= 0; k--) {
    const d = new Date(
      Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() - k, 1)
    );
    const key = d.toISOString().slice(0, 7);
    monthlyMap.set(key, {
      month: new Intl.DateTimeFormat(intlLocale, {
        month: "short",
        timeZone: "UTC",
      }).format(d),
      expenses: 0,
      income: 0,
    });
  }
  for (const t of seriesTx) {
    const key = t.date.toISOString().slice(0, 7);
    const entry = monthlyMap.get(key);
    if (!entry) continue;
    if (t.type === "EXPENSE") entry.expenses += Number(t.amountBase);
    else entry.income += Number(t.amountBase);
  }
  const series = [...monthlyMap.values()].map((m) => ({
    ...m,
    expenses: Math.round(m.expenses * 100) / 100,
    income: Math.round(m.income * 100) / 100,
  }));

  // Current-month expenses by category.
  const catById = new Map(categories.map((c) => [c.id, c]));
  const spentByCat = new Map<string, number>();
  for (const t of monthTxByCat) {
    if (!t.categoryId) continue;
    spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + Number(t.amountBase));
  }
  const pieData: PieDatum[] = [...spentByCat.entries()]
    .map(([id, value]) => {
      const c = catById.get(id);
      return {
        name: c ? `${c.icon} ${t(c.name)}` : t("Uncategorized"),
        value,
        color: c?.color ?? "#94a3b8",
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Monthly budget alerts.
  const spentMap = new Map(budgetSpent.map((b) => [b.categoryId!, Number(b._sum.amountBase ?? 0)]));
  const alerts = budgets
    .map((b) => ({
      id: b.id,
      name: `${b.category.icon} ${t(b.category.name)}`,
      color: b.category.color,
      limit: Number(b.amount),
      spent: spentMap.get(b.categoryId) ?? 0,
      threshold: b.alertThreshold,
    }))
    .filter((b) => b.limit > 0 && (b.spent / b.limit) * 100 >= b.threshold)
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
    .slice(0, 4);

  const cards = [
    {
      title: t("Spent today"),
      value: Number(todayAgg._sum.amountBase ?? 0),
      icon: CalendarDaysIcon,
      tone: "text-red-500",
      sub: undefined as string | undefined,
    },
    {
      title: t("This week"),
      value: Number(weekAgg._sum.amountBase ?? 0),
      icon: TrendingUpIcon,
      tone: "text-orange-500",
      sub: undefined as string | undefined,
    },
    {
      title: t("Monthly expenses"),
      value: Number(monthExp._sum.amountBase ?? 0),
      icon: ArrowDownRightIcon,
      tone: "text-red-500",
      sub:
        monthPrevOut > 0
          ? t("+ forecast −{amount} by month end", {
              amount: formatMoneyCompact(monthPrevOut, currency, intlLocale),
            })
          : undefined,
    },
    {
      title: t("Monthly income"),
      value: Number(monthInc._sum.amountBase ?? 0),
      icon: ArrowUpRightIcon,
      tone: "text-emerald-500",
      sub: undefined as string | undefined,
    },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">
          {t("Hello {name}", { name: user.name ?? "👋" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {account.icon} {account.name} · {formatDisplayDate(todayStr, intlLocale)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground md:text-sm">{c.title}</p>
                <c.icon className={`size-4 ${c.tone}`} />
              </div>
              <p className="mt-1 text-base font-semibold tabular-nums md:text-xl">
                {formatMoney(c.value, currency, intlLocale)}
              </p>
              {c.sub && (
                <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                  {c.sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Last 6 months")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart data={series} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Expenses by category · this month")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[240px_1fr] sm:items-center">
            <CategoryPieChart data={pieData} currency={currency} />
            <CategoryLegend data={pieData} currency={currency} />
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBankIcon className="size-4" />
              {t("Budgets under pressure")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {alerts.map((a) => {
              const pct = Math.round((a.spent / a.limit) * 100);
              return (
                <Link key={a.id} href="/budgets" className="grid gap-1.5 rounded-lg border p-3 hover:bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{a.name}</span>
                    <Badge variant={pct >= 100 ? "destructive" : "secondary"}>
                      {pct}%
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(100, pct)}
                    aria-label={`${a.name}: ${pct}%`}
                  />
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {t("{spent} of {limit}", {
                      spent: formatMoney(a.spent, currency, intlLocale),
                      limit: formatMoney(a.limit, currency, intlLocale),
                    })}
                  </p>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {upcomingItems.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClockIcon className="size-4" />
              {t("Upcoming items · 30 days")}
            </CardTitle>
            <span className="rounded-md border border-dashed border-amber-400 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 tabular-nums dark:text-amber-400">
              {t("Forecast: −{amount}", {
                amount: formatMoneyCompact(upcomingOut, currency, intlLocale),
              })}
            </span>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y">
              {upcomingItems.slice(0, 7).map((u) => {
                const isIncome = u.type === "INCOME";
                return (
                  <li
                    key={u.id + u.date}
                    className="flex items-center gap-3 border-l-2 border-dashed border-amber-400/70 py-2.5 pl-3 pr-4"
                  >
                    <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDayMonth(u.date, intlLocale)}
                    </span>
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{
                        backgroundColor: (u.category?.color ?? "#f59e0b") + "22",
                      }}
                    >
                      {u.category?.icon ?? "📅"}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm">
                      {u.description || (u.category ? t(u.category.name) : null) || t(isIncome ? "Forecast income" : "Forecast expense")}
                    </p>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {formatMoneyCompact(u.amountBase, currency, intlLocale)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {upcomingItems.length > 7 && (
              <p className="px-4 pt-2 text-xs text-muted-foreground">
                {t("{count} more upcoming items in the", {
                  count: upcomingItems.length - 7,
                })}{" "}
                <Link href="/calendar" className="underline underline-offset-4">
                  {t("calendar")}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{t("Latest transactions")}</CardTitle>
          <Link href="/transactions" className="text-sm text-primary underline-offset-4 hover:underline">
            {t("View all")}
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("No transactions yet. Add one with the “New” button.")}
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((t) => {
                const isIncome = t.type === "INCOME";
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: (t.category?.color ?? "#94a3b8") + "22" }}
                    >
                      {t.category?.icon ?? "📦"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.description || (t.category ? tr(t.category.name) : null) || tr(isIncome ? "Income" : "Expense")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDisplayDate(t.date.toISOString().slice(0, 10), intlLocale)}
                        {t.category ? ` · ${tr(t.category.name)}` : ""}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : ""
                      }`}
                    >
                      {isIncome ? "+" : ""}
                      {formatMoney(Number(t.amount), t.currency, intlLocale)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
