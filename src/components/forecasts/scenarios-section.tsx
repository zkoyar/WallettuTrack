"use client";

import * as React from "react";
import { LoaderCircleIcon, SlidersHorizontalIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatMoneyCompact } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface BaselineCategory {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  avgMonthly: number;
}

export function ScenariosSection({ baseCurrency }: { baseCurrency: string }) {
  const { intlLocale, t } = useI18n();
  const [baseline, setBaseline] = React.useState<{
    categories: BaselineCategory[];
    baselineTotal: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [deltas, setDeltas] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetch("/api/scenarios/baseline").then((r) => r.json());
        if (!alive) return;
        setBaseline({ categories: d.categories ?? [], baselineTotal: d.baselineTotal ?? 0 });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <LoaderCircleIcon className="mx-auto size-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!baseline || baseline.categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("Expense data from the last 90 days is required to simulate scenarios.")}
        </CardContent>
      </Card>
    );
  }

  const adjusted = baseline.categories.map((c) => ({
    ...c,
    factor: 1 + (deltas[c.categoryId] ?? 0) / 100,
    value:
      c.avgMonthly *
      (1 + (deltas[c.categoryId] ?? 0) / 100),
  }));
  const simTotal =
    Math.round(adjusted.reduce((s, c) => s + c.value, 0) * 100) / 100;
  const deltaMonth = Math.round((simTotal - baseline.baselineTotal) * 100) / 100;
  const deltaYear = Math.round(deltaMonth * 12 * 100) / 100;
  const anyDelta = Object.values(deltas).some((v) => v !== 0);

  function setDelta(id: string, v: number) {
    setDeltas((prev) => ({ ...prev, [id]: v }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontalIcon className="size-4" />
          {t("Scenario simulator")}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {t("90-day monthly average")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        {/* Summary. */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border p-3",
            !anyDelta && "opacity-70"
          )}
        >
          <div>
            <p className="text-xs text-muted-foreground">{t("Current monthly expenses")}</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatMoney(baseline.baselineTotal, baseCurrency, intlLocale)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("With the selected scenario")}</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                deltaMonth > 0 && "text-red-500",
                deltaMonth < 0 && "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {formatMoney(simTotal, baseCurrency, intlLocale)}
            </p>
          </div>
          <div className="min-w-[140px] flex-1">
            <p className="text-xs text-muted-foreground">{t("Annual impact")}</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                deltaYear > 0 && "text-red-500",
                deltaYear < 0 && "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {deltaYear > 0 ? "+" : ""}
              {formatMoney(deltaYear, baseCurrency, intlLocale)}
              {t("/year")}
            </p>
          </div>
          {anyDelta && (
            <button
              onClick={() => setDeltas({})}
              className="rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              {t("Reset")}
            </button>
          )}
        </div>

        {/* Sliders by category. */}
        <ul className="grid gap-4">
          {adjusted.map((c) => {
            const pct = deltas[c.categoryId] ?? 0;
            return (
              <li key={c.categoryId} className="grid gap-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: c.color + "22" }}
                  >
                    {c.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t(c.name)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoneyCompact(c.avgMonthly, baseCurrency, intlLocale)}{t("/month")} →{" "}
                    <strong
                      className={cn(
                        "tabular-nums",
                        pct > 0 && "text-red-500",
                        pct < 0 && "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {formatMoneyCompact(c.value, baseCurrency, intlLocale)}
                    </strong>
                  </span>
                  <span
                    className={cn(
                      "w-14 shrink-0 text-right text-xs tabular-nums",
                      pct > 0 && "text-red-500",
                      pct < 0 && "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {pct > 0 ? "+" : ""}
                    {pct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={5}
                  value={pct}
                  onChange={(e) => setDelta(c.categoryId, Number(e.target.value))}
                  aria-label={t("Adjust {name}", { name: t(c.name) })}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
                />
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          {t("Move the sliders to simulate cuts or increases. The impact is calculated from your actual 90-day average.")}
        </p>
      </CardContent>
    </Card>
  );
}
