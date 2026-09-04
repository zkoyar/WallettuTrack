import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, formatMoneyCompact } from "@/lib/currencies";
import {
  diffDaysIso,
  endOfMonthIso,
  formatDisplayDate,
  inclusiveDateRangeUtc,
  parseDateOnly,
  round2,
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
import {
  MonthlyBarChart,
  type MonthlyBarDatum,
} from "@/components/charts/monthly-bar-chart";
import {
  CategoryPieChart,
  CategoryLegend,
  type PieDatum,
} from "@/components/charts/category-pie-chart";
import {
  YearCompareChart,
  type YearCompareDatum,
} from "@/components/charts/year-compare-chart";
import { cn } from "@/lib/utils";
import { getSelectedAccount } from "@/lib/selected-account";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";
import { getIntlLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Statistics")} · WallettuTrack` };
}



const PERIODS = [
  { key: "month", label: "Month" },
  { key: "3m", label: "3 months" },
  { key: "year", label: "Year" },
  { key: "all", label: "All" },
] as const;

const UNCATEGORIZED_ID = "__uncategorized__";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t: tr } = await getServerI18n();
  const intlLocale = getIntlLocale(locale);
  const sp = await searchParams;
  const raw = typeof sp.period === "string" ? sp.period : "month";
  const period = PERIODS.find((p) => p.key === raw)?.key ?? "month";
  // Forecasts are included by default; ?prev=0 excludes them.
  const includePrev = typeof sp.prev === "string" ? sp.prev !== "0" : true;

  const user = await requireUser();
  const userId = user.id;
  const currency = user.baseCurrency;
  const account = await getSelectedAccount(userId);
  if (!account) return null;
  const accountId = account.id;

  const todayStr = todayString();
  const now = parseDateOnly(todayStr);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  let fromStr: string;
  switch (period) {
    case "month":
      fromStr = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      break;
    case "3m": {
      const d = new Date(Date.UTC(y, m - 2, 1));
      fromStr = iso(d);
      break;
    }
    case "year":
      fromStr = `${y}-01-01`;
      break;
    default:
      fromStr = "2000-01-01";
  }
  // Forecast window: through two months ahead.
  const horizonEnd = iso(new Date(Date.UTC(y, m + 3, 0)));

  const [txs, upcoming] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        accountId,
        transferGroupId: null,
        date: inclusiveDateRangeUtc(fromStr, todayStr),
      },
      select: { type: true, amountBase: true, date: true, categoryId: true },
      orderBy: { date: "asc" },
    }),
    includePrev
      ? getUpcomingOccurrences(
          userId,
          todayStr,
          horizonEnd,
          accountId
        )
      : Promise.resolve([]),
  ]);

  // Previous year, used only in the yearly view.
  const prevYearFrom = `${y - 1}-01-01`;
  const prevYearTo = `${y - 1}-12-31`;
  const [prevYearTxs, curYearTxs] = period === "year"
    ? await Promise.all([
        db.transaction.findMany({
          where: {
            userId,
            accountId,
            transferGroupId: null,
            date: inclusiveDateRangeUtc(prevYearFrom, prevYearTo),
          },
          select: { type: true, amountBase: true, date: true, categoryId: true },
        }),
        db.transaction.findMany({
          where: {
            userId,
            accountId,
            transferGroupId: null,
            date: inclusiveDateRangeUtc(`${y}-01-01`, todayStr),
          },
          select: { type: true, amountBase: true, date: true, categoryId: true },
        }),
      ])
    : [[], []];

  const categories = await db.category.findMany({ where: { userId } });
  const catById = new Map(categories.map((c) => [c.id, c]));

  let realExp = 0;
  let realInc = 0;

  const expByCat = new Map<string, number>();
  const incByCat = new Map<string, number>();
  const monthlyMap = new Map<
    string,
    MonthlyBarDatum & { sortKey: string }
  >();

  // The series follows the selected period and adds two forecast months.
  const seriesMonths =
    period === "month" ? 1 : period === "3m" ? 3 : period === "year" ? 12 : 24;
  for (let k = seriesMonths - 1; k >= -2; k--) {
    const d = new Date(Date.UTC(y, m - k, 1));
    const key = d.toISOString().slice(0, 7);
    monthlyMap.set(key, {
      sortKey: key,
      month:
        seriesMonths > 12
          ? `${new Intl.DateTimeFormat(intlLocale, { month: "short", timeZone: "UTC" }).format(d)} '${String(d.getUTCFullYear()).slice(-2)}`
          : new Intl.DateTimeFormat(intlLocale, {
              month: "short",
              timeZone: "UTC",
            }).format(d),
      expenses: 0,
      income: 0,
      projectedExpenses: 0,
      projectedIncome: 0,
    });
  }

  for (const t of txs) {
    const amt = Number(t.amountBase);
    if (t.type === "EXPENSE") realExp += amt;
    else realInc += amt;

    const target = t.type === "EXPENSE" ? expByCat : incByCat;
    const categoryId = t.categoryId ?? UNCATEGORIZED_ID;
    target.set(categoryId, (target.get(categoryId) ?? 0) + amt);

    const key = t.date.toISOString().slice(0, 7);
    const entry = monthlyMap.get(key);
    if (entry) {
      if (t.type === "EXPENSE") entry.expenses += amt;
      else entry.income += amt;
    }
  }

  for (const u of upcoming) {
    const amt = u.amountBase;

    const target = u.type === "EXPENSE" ? expByCat : incByCat;
    const categoryId = u.category?.id ?? UNCATEGORIZED_ID;
    target.set(categoryId, (target.get(categoryId) ?? 0) + amt);

    const entry = monthlyMap.get(u.date.slice(0, 7));
    if (entry) {
      if (u.type === "EXPENSE") entry.projectedExpenses = (entry.projectedExpenses ?? 0) + amt;
      else entry.projectedIncome = (entry.projectedIncome ?? 0) + amt;
    }
  }

  const projectedThisMonth = upcoming.filter(
    (u) => u.date <= endOfMonthIso(todayStr)
  );
  const projectedMonthExp = projectedThisMonth
    .filter((u) => u.type === "EXPENSE")
    .reduce((s, u) => s + u.amountBase, 0);
  const projectedMonthInc = projectedThisMonth
    .filter((u) => u.type === "INCOME")
    .reduce((s, u) => s + u.amountBase, 0);

  const series = [...monthlyMap.values()]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((v) => ({
      month: v.month,
      expenses: Math.round(v.expenses * 100) / 100,
      income: Math.round(v.income * 100) / 100,
      projectedExpenses:
        includePrev && v.projectedExpenses
          ? Math.round(v.projectedExpenses * 100) / 100
          : undefined,
      projectedIncome:
        includePrev && v.projectedIncome
          ? Math.round(v.projectedIncome * 100) / 100
          : undefined,
    }));

  function toPie(map: Map<string, number>): PieDatum[] {
    const entries = [...map.entries()]
      .map(([id, value]) => {
        const c = catById.get(id);
        return {
          name: c ? `${c.icon} ${tr(c.name)}` : tr("Uncategorized"),
          value,
          color: c?.color ?? "#94a3b8",
        };
      })
      .sort((a, b) => b.value - a.value);

    if (entries.length <= 8) return entries;

    return [
      ...entries.slice(0, 7),
      {
        name: tr("Other categories"),
        value: entries.slice(7).reduce((sum, item) => sum + item.value, 0),
        color: "#94a3b8",
      },
    ];
  }

  const expPie = toPie(expByCat);
  const incPie = toPie(incByCat);

  // ---- Year-over-year comparison for the yearly period. ----
  let yoyData: YearCompareDatum[] = [];
  let categoryDeltas: {
    name: string;
    icon: string;
    color: string;
    cur: number;
    prev: number;
  }[] = [];
  if (period === "year") {
    const curByMonth = new Map<number, number>();
    const prevByMonth = new Map<number, number>();
    for (const t of curYearTxs) {
      if (t.type !== "EXPENSE") continue;
      const mo = t.date.getUTCMonth();
      curByMonth.set(mo, (curByMonth.get(mo) ?? 0) + Number(t.amountBase));
    }
    for (const t of prevYearTxs) {
      if (t.type !== "EXPENSE") continue;
      const mo = t.date.getUTCMonth();
      prevByMonth.set(mo, (prevByMonth.get(mo) ?? 0) + Number(t.amountBase));
    }
    yoyData = Array.from({ length: 12 }, (_, mo) => ({
      month: new Intl.DateTimeFormat(intlLocale, {
        month: "short",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(y, mo, 1))),
      current: round2(curByMonth.get(mo) ?? 0),
      previous: round2(prevByMonth.get(mo) ?? 0),
    }));

    const curByCat = new Map<string, number>();
    const prevByCat = new Map<string, number>();
    for (const t of curYearTxs) {
      if (!t.categoryId || t.type !== "EXPENSE") continue;
      curByCat.set(t.categoryId, (curByCat.get(t.categoryId) ?? 0) + Number(t.amountBase));
    }
    for (const t of prevYearTxs) {
      if (!t.categoryId || t.type !== "EXPENSE") continue;
      prevByCat.set(t.categoryId, (prevByCat.get(t.categoryId) ?? 0) + Number(t.amountBase));
    }
    const categoryIds = new Set([...curByCat.keys(), ...prevByCat.keys()]);
    categoryDeltas = [...categoryIds]
      .map((id) => {
        const c = catById.get(id);
        return {
          name: c ? tr(c.name) : "—",
          icon: c?.icon ?? "📦",
          color: c?.color ?? "#94a3b8",
          cur: curByCat.get(id) ?? 0,
          prev: prevByCat.get(id) ?? 0,
        };
      })
      .sort((a, b) => Math.max(b.cur, b.prev) - Math.max(a.cur, a.prev))
      .slice(0, 8);
  }

  // For "All", calculate the average from the first real transaction, not a synthetic date.
  const effectiveFromStr =
    period === "all"
      ? txs[0]?.date.toISOString().slice(0, 10) ?? todayStr
      : fromStr;
  const daysInRange = Math.max(1, diffDaysIso(effectiveFromStr, todayStr) + 1);
  const realBalance = realInc - realExp;
  const projectedMonthBalance =
    realBalance + projectedMonthInc - projectedMonthExp;

  const stats: {
    label: string;
    value: string;
    tone?: string;
    sub?: string;
    subTone?: string;
  }[] = [
    { label: tr("Actual expenses"), value: formatMoney(realExp, currency, intlLocale) },
    { label: tr("Actual income"), value: formatMoney(realInc, currency, intlLocale) },
    {
      label: tr("Actual net balance"),
      value: formatMoney(realBalance, currency, intlLocale),
      tone:
        realBalance >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-500",
    },
    {
      label: tr("Average expenses/day"),
      value: formatMoney(realExp / daysInRange, currency, intlLocale),
    },
  ];
  if (includePrev && projectedMonthExp > 0) {
    stats[0].sub = tr("Forecast by month end: −{amount}", {
      amount: formatMoneyCompact(projectedMonthExp, currency, intlLocale),
    });
  }
  if (includePrev && projectedMonthInc > 0) {
    stats[1].sub = tr("Forecast by month end: +{amount}", {
      amount: formatMoneyCompact(projectedMonthInc, currency, intlLocale),
    });
  }
  if (includePrev && projectedThisMonth.length > 0) {
    stats[2].sub = tr("Estimated month-end balance: {amount}", {
      amount: formatMoneyCompact(projectedMonthBalance, currency, intlLocale),
    });
    stats[2].subTone =
      projectedMonthBalance >= 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-500";
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{tr("Statistics")}</h1>
          <p className="text-sm text-muted-foreground">
            {tr("From {date} through today · {account} · values in {currency}", {
              date: formatDisplayDate(
                period === "all"
                  ? txs[0]?.date.toISOString().slice(0, 10) ?? fromStr
                  : fromStr,
                intlLocale
              ),
              account: `${account.icon} ${account.name}`,
              currency,
            })}
          </p>
        </div>
        <nav className="flex flex-wrap gap-1 rounded-lg border p-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/statistics?period=${p.key}${includePrev ? "" : "&prev=0"}`}
              aria-current={period === p.key ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                period === p.key
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tr(p.label)}
            </Link>
          ))}
          <span className="mx-1 hidden w-px bg-border sm:block" />
          <Link
            href={`/statistics?period=${period}&prev=${includePrev ? "0" : "1"}`}
            title={tr("Include or exclude transactions forecast from recurrence rules")}
            className={cn(
              "rounded-md border border-dashed px-3 py-1.5 text-sm transition-colors",
              includePrev
                ? "border-amber-400 bg-amber-500/10 font-medium text-amber-700 dark:text-amber-400"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tr("Forecasts: {state}", {
              state: tr(includePrev ? "ON" : "OFF"),
            })}
          </Link>
          <a
            href={`/report?m=${todayStr.slice(0, 7)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            📄 {tr("Report PDF")}
          </a>
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <p className="text-xs text-muted-foreground md:text-sm">{s.label}</p>
              <p
                className={cn(
                  "mt-1 text-base font-semibold tabular-nums md:text-xl",
                  s.tone
                )}
              >
                {s.value}
              </p>
              {s.sub && (
                <p
                  className={cn(
                    "mt-0.5 text-[11px] text-amber-600 dark:text-amber-400",
                    s.subTone
                  )}
                >
                  {s.sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tr("Monthly trend")}
            {includePrev && (
              <span className="ml-2 rounded-sm border border-dashed border-amber-400 px-1.5 py-0.5 align-middle text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {tr("with forecasts (+2 months)")}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart data={series} currency={currency} />
        </CardContent>
      </Card>

      {period === "year" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tr("Expense comparison {previous} vs {current}", {
                previous: y - 1,
                current: y,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <YearCompareChart data={yoyData} currency={currency} />
            {categoryDeltas.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  {tr("Change by category (current year vs previous year)")}
                </p>
                <ul className="divide-y rounded-lg border">
                  {categoryDeltas.map((d) => {
                    const delta = d.prev > 0 ? ((d.cur - d.prev) / d.prev) * 100 : null;
                    const up = delta !== null && delta > 0;
                    return (
                      <li key={d.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: d.color + "22" }}
                        >
                          {d.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{d.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatMoneyCompact(d.prev, currency, intlLocale)}
                        </span>
                        <span>→</span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatMoneyCompact(d.cur, currency, intlLocale)}
                        </span>
                        <span
                          className={cn(
                            "w-16 shrink-0 text-right text-xs font-medium tabular-nums",
                            delta === null
                              ? "text-muted-foreground"
                              : up
                                ? "text-red-500"
                                : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {delta === null
                            ? tr("new")
                            : `${up ? "+" : ""}${Math.round(delta)}%`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tr("Expenses by category")}{includePrev ? tr(" · with forecasts") : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <CategoryPieChart data={expPie} currency={currency} />
            <CategoryLegend data={expPie} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tr("Income by category")}{includePrev ? tr(" · with forecasts") : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <CategoryPieChart data={incPie} currency={currency} />
            <CategoryLegend data={incPie} currency={currency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
