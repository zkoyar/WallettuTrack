"use client";

import * as React from "react";
import { ArrowRightIcon, LoaderCircleIcon, ScaleIcon } from "lucide-react";
import { toast } from "sonner";
import { apiSend, useApiData } from "@/lib/api-client";
import { formatMoney } from "@/lib/currencies";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";

interface ReconciliationItem {
  id: string;
  balanceBefore: number;
  actualBalance: number;
  difference: number;
  notes: string | null;
  reconciledAt: string;
}

interface ReconciliationData {
  account: { id: string; name: string; icon: string; currentBalance: number };
  items: ReconciliationItem[];
}

export function ReconciliationClient({ baseCurrency }: { baseCurrency: string }) {
  const { intlLocale, t } = useI18n();
  const dataApi = useApiData<ReconciliationData>("/api/reconciliations");
  const data = dataApi.data;
  const [actualBalance, setActualBalance] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const parsedBalance = Number(actualBalance.replace(",", "."));
  const difference =
    data && Number.isFinite(parsedBalance)
      ? Math.round((parsedBalance - data.account.currentBalance) * 100) / 100
      : null;

  async function reconcile(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(parsedBalance)) return toast.error(t("Enter the actual balance"));
    setSaving(true);
    const { ok, error } = await apiSend("/api/reconciliations", "POST", {
      actualBalance: parsedBalance,
      notes: notes.trim(),
    });
    setSaving(false);
    if (!ok) return toast.error(t(error ?? "Reconciliation failed"));
    toast.success(t("Balance reconciled"));
    window.location.reload();
  }

  if (dataApi.loading || !data) {
    return (
      <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" />
        {t("Loading reconciliation…")}
      </p>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">{t("Account reconciliation")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("{account} · compare the recorded balance with the actual balance.", {
            account: `${data.account.icon} ${data.account.name}`,
          })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScaleIcon className="size-4" />
            {t("Verify balance")}
          </CardTitle>
          <CardDescription>
            {t("Reconciliation updates the account's declared balance and keeps the difference in its history.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={reconcile} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="grid gap-2">
                <Label>{t("Recorded balance")}</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 font-medium tabular-nums">
                  {formatMoney(data.account.currentBalance, baseCurrency, intlLocale)}
                </div>
              </div>
              <ArrowRightIcon className="mb-2 hidden size-4 text-muted-foreground sm:block" />
              <div className="grid gap-2">
                <Label htmlFor="actual-balance">{t("Actual balance")}</Label>
                <Input
                  id="actual-balance"
                  inputMode="decimal"
                  value={actualBalance}
                  onChange={(event) => setActualBalance(event.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
            {difference !== null && (
              <p className="rounded-md border p-2.5 text-sm tabular-nums">
                {t("Difference:")} <strong>{difference > 0 ? "+" : ""}{formatMoney(difference, baseCurrency, intlLocale)}</strong>
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="reconciliation-notes">{t("Optional note")}</Label>
              <Input
                id="reconciliation-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("For example, monthly statement balance")}
                maxLength={191}
              />
            </div>
            <div>
              <Button type="submit" disabled={saving || !actualBalance.trim()}>
                {saving && <LoaderCircleIcon className="animate-spin" />}
                {t("Reconcile balance")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Reconciliation history")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {data.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("No reconciliations recorded.")}
            </p>
          ) : (
            <ul className="divide-y">
              {data.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="w-24 text-muted-foreground tabular-nums">
                    {formatDisplayDate(item.reconciledAt.slice(0, 10), intlLocale)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.notes || t("Balance reconciliation")}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(item.balanceBefore, baseCurrency, intlLocale)} → {formatMoney(item.actualBalance, baseCurrency, intlLocale)}
                  </span>
                  <strong className="w-24 text-right tabular-nums">
                    {item.difference > 0 ? "+" : ""}{formatMoney(item.difference, baseCurrency, intlLocale)}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
