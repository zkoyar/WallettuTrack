"use client";

import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatMoneyCompact } from "@/lib/currencies";
import { useI18n } from "@/components/i18n-provider";

export interface PieDatum {
  name: string;
  value: number;
  color: string;
}

export function CategoryPieChart({
  data,
  currency,
}: {
  data: PieDatum[];
  currency: string;
}) {
  const { intlLocale, t } = useI18n();
  if (data.length === 0) {
    return (
      <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        {t("No data for this period")}
      </p>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative min-w-0 [&_.recharts-sector]:transition-[opacity,filter] [&_.recharts-sector]:duration-200 [&_.recharts-sector]:hover:drop-shadow-md">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart accessibilityLayer>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            cornerRadius={4}
            stroke="var(--card)"
            strokeWidth={2}
            activeShape={{
              outerRadius: 94,
              stroke: "var(--background)",
              strokeWidth: 3,
              filter: "drop-shadow(0 5px 7px rgb(0 0 0 / 0.2))",
            }}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
              color: "var(--popover-foreground)",
            }}
            itemStyle={{ padding: 0 }}
            formatter={(value) => formatMoneyCompact(Number(value), currency, intlLocale)}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Total")}</span>
        <span className="mt-0.5 max-w-28 truncate text-sm font-semibold tabular-nums">
          {formatMoneyCompact(total, currency, intlLocale)}
        </span>
      </div>
    </div>
  );
}

export function CategoryLegend({
  data,
  currency,
}: {
  data: PieDatum[];
  currency: string;
}) {
  const { intlLocale, t } = useI18n();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="grid gap-1.5 text-sm">
      {data.map((d) => (
        <li key={d.name} className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: d.color }}
          />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {t(d.name)}
          </span>
          <span className="font-medium">{formatMoneyCompact(d.value, currency, intlLocale)}</span>
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
            {total > 0 ? `${Math.round((d.value / total) * 100)}%` : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
