"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoneyAxis, formatMoneyCompact } from "@/lib/currencies";
import { useI18n } from "@/components/i18n-provider";

export interface YearCompareDatum {
  month: string;
  current: number;
  previous: number;
}

export function YearCompareChart({
  data,
  currency,
}: {
  data: YearCompareDatum[];
  currency: string;
}) {
  const { intlLocale, t } = useI18n();
  return (
    <div className="min-w-0 [&_.recharts-rectangle]:transition-[opacity,filter] [&_.recharts-rectangle]:duration-200 [&_.recharts-inactive-bar]:opacity-35">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          accessibilityLayer
          data={data}
          barCategoryGap="22%"
          barGap={4}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
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
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => <span className="text-muted-foreground">{value}</span>}
        />
          <Bar
            dataKey="previous"
            fill="#94a3b8"
            maxBarSize={30}
            radius={[5, 5, 0, 0]}
            activeBar={{
              filter: "drop-shadow(0 4px 6px rgb(148 163 184 / 0.3))",
              stroke: "#cbd5e1",
              strokeWidth: 2,
            }}
            name={t("Previous year")}
          />
          <Bar
            dataKey="current"
            fill="#6366f1"
            maxBarSize={30}
            radius={[5, 5, 0, 0]}
            activeBar={{
              filter: "drop-shadow(0 4px 6px rgb(99 102 241 / 0.3))",
              stroke: "#818cf8",
              strokeWidth: 2,
            }}
            name={t("Current year")}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
