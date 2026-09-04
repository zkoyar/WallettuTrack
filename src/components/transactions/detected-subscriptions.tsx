"use client";

import * as React from "react";
import { LoaderCircleIcon, SparklesIcon, TrendingUpIcon } from "lucide-react";
import { toast } from "sonner";
import { apiSend, useApiData } from "@/lib/api-client";
import { formatMoney } from "@/lib/currencies";
import { formatDisplayDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

interface Candidate {
  id: string;
  description: string;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  occurrences: number;
  averageAmount: number;
  latestAmount: number;
  previousAverage: number | null;
  priceChangePercent: number | null;
  currency: string;
  lastDate: string;
  nextDate: string;
  alreadyTracked: boolean;
  category: { id: string; name: string; icon: string; color: string } | null;
}

const FREQUENCY_LABELS = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export function DetectedSubscriptions({ onCreated }: { onCreated: () => void }) {
  const { intlLocale, t } = useI18n();
  const dataApi = useApiData<{ items: Candidate[] }>("/api/subscriptions");
  const [creatingId, setCreatingId] = React.useState<string | null>(null);
  const candidates = dataApi.data?.items ?? [];

  async function createRule(candidate: Candidate) {
    const start = new Date(`${candidate.nextDate}T00:00:00Z`);
    const payload: Record<string, unknown> = {
      type: "EXPENSE",
      categoryId: candidate.category?.id ?? null,
      amount: candidate.latestAmount,
      currency: candidate.currency,
      description: candidate.description,
      frequency: candidate.frequency,
      interval: candidate.interval,
      startDate: candidate.nextDate,
      active: true,
    };
    if (candidate.frequency === "WEEKLY") {
      payload.daysOfWeek = String(start.getUTCDay());
    }
    if (candidate.frequency === "MONTHLY" || candidate.frequency === "YEARLY") {
      payload.dayOfMonth = start.getUTCDate();
    }
    if (candidate.frequency === "YEARLY") {
      payload.monthOfYear = start.getUTCMonth() + 1;
    }

    setCreatingId(candidate.id);
    const { ok, error } = await apiSend("/api/recurrences", "POST", payload);
    setCreatingId(null);
    if (!ok) return toast.error(t(error ?? "Could not create recurrence"));
    toast.success(t("Subscription added to recurring items"));
    await dataApi.refresh();
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SparklesIcon className="size-4" />
          {t("Detected subscriptions")}
        </CardTitle>
        <CardDescription>
          {t("Detected automatically from consistent descriptions, dates, and amounts.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {dataApi.loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" /> {t("Analyzing movements…")}
          </p>
        ) : candidates.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("No sufficiently regular subscriptions detected.")}
          </p>
        ) : (
          <ul className="divide-y">
            {candidates.map((candidate) => (
              <li key={candidate.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${candidate.category?.color ?? "#6366f1"}22` }}
                >
                  {candidate.category?.icon ?? "🔁"}
                </span>
                <div className="min-w-0 flex-1 basis-52">
                  <p className="truncate text-sm font-medium">{candidate.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("{frequency}{interval} · {count} charges · next {date}", {
                      frequency: t(FREQUENCY_LABELS[candidate.frequency]),
                      interval: candidate.interval > 1
                        ? t(" every {count}", { count: candidate.interval })
                        : "",
                      count: candidate.occurrences,
                      date: formatDisplayDate(candidate.nextDate, intlLocale),
                    })}
                  </p>
                </div>
                {candidate.priceChangePercent !== null && (
                  <Badge variant="destructive" className="gap-1">
                    <TrendingUpIcon className="size-3" /> +{candidate.priceChangePercent}%
                  </Badge>
                )}
                <strong className="tabular-nums">{formatMoney(candidate.latestAmount, candidate.currency, intlLocale)}</strong>
                <Button
                  size="sm"
                  variant={candidate.alreadyTracked ? "outline" : "default"}
                  disabled={candidate.alreadyTracked || creatingId === candidate.id}
                  onClick={() => createRule(candidate)}
                >
                  {creatingId === candidate.id && <LoaderCircleIcon className="animate-spin" />}
                  {t(candidate.alreadyTracked ? "Already tracked" : "Create recurrence")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
