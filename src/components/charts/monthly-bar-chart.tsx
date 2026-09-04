"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoneyAxis, formatMoneyCompact } from "@/lib/currencies";
import { useI18n } from "@/components/i18n-provider";

export interface MonthlyBarDatum {
  month: string;
  expenses: number;
  income: number;
  /** Forecast portion of the month that has not occurred yet. */
  projectedExpenses?: number;
  projectedIncome?: number;
}

export function MonthlyBarChart({
  data,
  currency,
}: {
  data: MonthlyBarDatum[];
  currency: string;
}) {
  const { intlLocale, t } = useI18n();
  const hasForecast = data.some(
    (d) => (d.projectedExpenses ?? 0) > 0 || (d.projectedIncome ?? 0) > 0
  );
  const totalExpenses = data.reduce(
    (total, item) => total + item.expenses + (item.projectedExpenses ?? 0),
    0
  );
  const totalIncome = data.reduce(
    (total, item) => total + item.income + (item.projectedIncome ?? 0),
    0
  );
  const balance = totalIncome - totalExpenses;

  if (totalExpenses === 0 && totalIncome === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center">
        <p className="text-sm font-medium">{t("No movements in this period")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("The chart will appear when income or expenses are available.")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 [&_.recharts-rectangle]:transition-[opacity,filter] [&_.recharts-rectangle]:duration-200 [&_.recharts-inactive-bar]:opacity-35">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500" />
          {t("Expenses")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" />
          {t("Income")}
        </span>
        {hasForecast && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border border-dashed border-amber-500 bg-amber-500/20" />
            {t("Forecast portion")}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          accessibilityLayer
          data={data}
          barCategoryGap="24%"
          barGap={4}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickMargin={8}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={68}
            tickFormatter={(value) => formatMoneyAxis(Number(value), currency, intlLocale)}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "currentColor", opacity: 0.06 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
            itemStyle={{ paddingTop: 3, paddingBottom: 0 }}
            formatter={(value) => formatMoneyCompact(Number(value), currency, intlLocale)}
          />
          <Bar
            dataKey="expenses"
            stackId="expenses"
            fill="#f43f5e"
            maxBarSize={34}
            radius={hasForecast ? [0, 0, 3, 3] : [5, 5, 0, 0]}
            activeBar={{
              fillOpacity: 1,
              filter: "drop-shadow(0 4px 6px rgb(244 63 94 / 0.28))",
              stroke: "#fb7185",
              strokeWidth: 2,
            }}
            name={t("Expenses")}
          />
          {hasForecast && (
            <Bar
              dataKey="projectedExpenses"
              stackId="expenses"
              fill="#f59e0b"
              fillOpacity={0.25}
              stroke="#f59e0b"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              maxBarSize={34}
              radius={[5, 5, 0, 0]}
              activeBar={{
                fillOpacity: 0.45,
                filter: "drop-shadow(0 4px 6px rgb(245 158 11 / 0.25))",
                stroke: "#fbbf24",
                strokeWidth: 2,
              }}
              name={t("Forecast expenses")}
            />
          )}
          <Bar
            dataKey="income"
            stackId="income"
            fill="#10b981"
            maxBarSize={34}
            radius={hasForecast ? [0, 0, 3, 3] : [5, 5, 0, 0]}
            activeBar={{
              fillOpacity: 1,
              filter: "drop-shadow(0 4px 6px rgb(16 185 129 / 0.28))",
              stroke: "#34d399",
              strokeWidth: 2,
            }}
            name={t("Income")}
          />
          {hasForecast && (
            <Bar
              dataKey="projectedIncome"
              stackId="income"
              fill="#84cc16"
              fillOpacity={0.25}
              stroke="#84cc16"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              maxBarSize={34}
              radius={[5, 5, 0, 0]}
              activeBar={{
                fillOpacity: 0.45,
                filter: "drop-shadow(0 4px 6px rgb(132 204 22 / 0.25))",
                stroke: "#a3e635",
                strokeWidth: 2,
              }}
              name={t("Forecast income")}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-3 divide-x rounded-lg border bg-muted/20 py-2 text-center">
        <div className="px-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Expenses")}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            {formatMoneyCompact(totalExpenses, currency, intlLocale)}
          </p>
        </div>
        <div className="px-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Income")}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoneyCompact(totalIncome, currency, intlLocale)}
          </p>
        </div>
        <div className="px-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Balance")}</p>
          <p className={`mt-0.5 text-sm font-semibold tabular-nums ${balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
            {formatMoneyCompact(balance, currency, intlLocale)}
          </p>
        </div>
      </div>
      {hasForecast && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("Dashed bars show the forecast portion of the month from recurring items that have not occurred yet.")}
        </p>
      )}
    </div>
  );
}
