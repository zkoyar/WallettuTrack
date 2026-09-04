"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  LoaderCircleIcon,
  Repeat2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScenariosSection } from "@/components/forecasts/scenarios-section";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatMoneyCompact } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { formatDayMonth } from "@/lib/dates";
import { useI18n } from "@/components/i18n-provider";

interface Point {
  date: string;
  balance: number;
  phase: "history" | "today" | "projected";
}

interface Movement {
  id: string;
  source: string;
  type: "EXPENSE" | "INCOME";
  date: string;
  description: string | null;
  amountBase: number;
}

interface CashflowData {
  account: { id: string; name: string; icon: string };
  currency: string;
  startBalance: number;
  points: Point[];
  endOfMonthBalance: number | null;
  minProjected: { date: string; value: number } | null;
  negativeDays: number;
  projectedExpenses90: number;
  projectedIncomes90: number;
  movements: Movement[];
}

export function ForecastsClient() {
  const { intlLocale, t: tr } = useI18n();
  const [data, setData] = React.useState<CashflowData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState(90);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/cashflow?days=${days}`);
        const d = await res.json();
        if (!alive) return;
        setData(res.ok === false ? null : d);
      } catch {
        if (alive) toast.error(tr("Could not load forecasts"));
      } finally {
        if (alive) setLoading(false);
      }
    };
    const t = setTimeout(load, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [days, tr]);

  function label(dateIso: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${dateIso}T00:00:00Z`));
  }

  if (loading || !data) {
    return (
      <div className="mx-auto grid max-w-6xl gap-4">
        <h1 className="text-xl font-semibold md:text-2xl">{tr("Forecasts")}</h1>
        <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" />
          {tr("Calculating cash flow…")}
        </p>
      </div>
    );
  }

  // Split the balance into a solid history/today series and a dashed
  // today/forecast series without breaking the chart at today's point.
  const chartData = data.points.map((p) => ({
    date: p.date,
    label: label(p.date),
    historical: p.phase === "projected" ? null : p.balance,
    forecast: p.phase === "history" ? null : p.balance,
    balance: p.balance,
  }));

  const lastProjected =
    data.points[data.points.length - 1]?.balance ?? data.startBalance;

  const kpis = [
    {
      label: tr("Current balance"),
      value: formatMoney(data.startBalance, data.currency, intlLocale),
      icon: WalletIcon,
      tone: "",
    },
    {
      label: tr("Month end"),
      value:
        data.endOfMonthBalance !== null
          ? formatMoney(data.endOfMonthBalance, data.currency, intlLocale)
          : "—",
      icon: CalendarDaysIcon,
      tone:
        data.endOfMonthBalance !== null && data.endOfMonthBalance < 0
          ? "text-red-500"
          : "",
    },
    {
      label: tr("Lowest point ({days}d)", { days }),
      value: data.minProjected
        ? `${formatMoney(data.minProjected.value, data.currency, intlLocale)} · ${label(data.minProjected.date)}`
        : "—",
      icon: TrendingDownIcon,
      tone:
        data.minProjected && data.minProjected.value < 0 ? "text-red-500" : "",
    },
    {
      label: tr("Expected movements (90d)"),
      value: `${formatMoneyCompact(data.projectedIncomes90, data.currency, intlLocale)} / −${formatMoneyCompact(
        data.projectedExpenses90,
        data.currency,
        intlLocale
      )}`,
      icon: TrendingUpIcon,
      tone: "",
    },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{tr("Cash-flow forecasts")}</h1>
          <p className="text-sm text-muted-foreground">
            {tr("Balance forecast based on recurring items, planned events, and future transactions. Update your balance in")}{" "}
            <Link href="/settings" className="underline underline-offset-4">
              {tr("Settings")}
            </Link>{" "}
            {tr("for greater accuracy.")}
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border p-1">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                days === d
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tr("{count} days", { count: d })}
            </button>
          ))}
        </nav>
      </div>

      {data.negativeDays > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-500/10 p-4 text-red-700 dark:border-red-800 dark:text-red-400">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">{tr("Warning: forecast balance below zero")}</p>
            <p className="text-sm">
              {tr("With the current planned expenses, your balance would be negative for {days}.", {
                days: tr("{count} days", { count: data.negativeDays }),
              })}
              {data.minProjected && (
                <>{tr(" (minimum {amount} on {date})", {
                  amount: formatMoney(data.minProjected.value, data.currency, intlLocale),
                  date: label(data.minProjected.date),
                })}</>
              )}
              {" "}{tr("Reduce some expenses or reschedule an event.")}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground md:text-sm">{k.label}</p>
                <k.icon className={cn("size-4 shrink-0 text-muted-foreground", k.tone)} />
              </div>
              <p className={cn("mt-1 text-base font-semibold tabular-nums md:text-xl", k.tone)}>
                {k.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{tr("Active account:")}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5">
          <span>{data.account.icon}</span>
          <strong>{data.account.name}</strong>
          <span className="tabular-nums text-muted-foreground">
            {formatMoneyCompact(data.startBalance, data.currency, intlLocale)}
          </span>
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("Forecast balance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={64} />
              <Tooltip
                formatter={(value) => formatMoney(Number(value), data.currency, intlLocale)}
                labelFormatter={(l) => String(l)}
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name={tr("Balance (historical)")}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
                name={tr("Forecast balance")}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tr("Blue line = recent actual balance · dashed amber line = future forecast · red line = zero threshold. End-of-horizon balance: {amount}", {
              amount: formatMoney(lastProjected, data.currency, intlLocale),
            })}
          </p>
        </CardContent>
      </Card>

      {data.movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat2Icon className="size-4" />
              {tr("Movements affecting the future")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y">
              {data.movements.slice(0, 12).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatDayMonth(m.date, intlLocale)}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 border border-dashed",
                      m.source === "event"
                        ? "border-sky-400 text-sky-600 dark:text-sky-400"
                        : "border-amber-400 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {m.source === "event"
                      ? tr("one-off event")
                      : m.source === "rule"
                        ? tr("recurring")
                        : tr("future transaction")}
                  </Badge>
                  <p className="min-w-0 flex-1 truncate text-sm">
                    {m.description ||
                      tr(m.type === "INCOME" ? "Forecast income" : "Forecast expense")}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      m.type === "INCOME"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {m.type === "INCOME" ? "+" : "−"}
                    {formatMoneyCompact(m.amountBase, data.currency, intlLocale)}
                  </span>
                 </li>
               ))}
             </ul>
           </CardContent>
         </Card>
       )}

      <ScenariosSection baseCurrency={data.currency} />
     </div>
   );
 }
