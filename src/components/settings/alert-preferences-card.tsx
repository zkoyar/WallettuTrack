"use client";

import * as React from "react";
import { BellRingIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import type { AlertPreferenceDto } from "@/lib/alert-preferences";
import { apiSend, useApiData } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/components/i18n-provider";

interface PreferenceResponse {
  account: { id: string; name: string; icon: string };
  item: AlertPreferenceDto;
}

export function AlertPreferencesCard() {
  const { t } = useI18n();
  const preferencesApi = useApiData<PreferenceResponse>("/api/alert-preferences");
  if (preferencesApi.loading || !preferencesApi.data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" /> {t("Loading alerts…")}
        </CardContent>
      </Card>
    );
  }
  return (
    <AlertPreferencesForm
      key={`${preferencesApi.data.account.id}-${JSON.stringify(preferencesApi.data.item)}`}
      data={preferencesApi.data}
      onSaved={preferencesApi.refresh}
    />
  );
}

function AlertPreferencesForm({
  data,
  onSaved,
}: {
  data: PreferenceResponse;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [value, setValue] = React.useState(data.item);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof AlertPreferenceDto>(key: K, next: AlertPreferenceDto[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  async function save() {
    setSaving(true);
    const { ok, error } = await apiSend("/api/alert-preferences", "PATCH", value);
    setSaving(false);
    if (!ok) return toast.error(t(error ?? "Could not save alerts"));
    toast.success(t("Alert preferences updated"));
    await onSaved();
  }

  const rows: Array<{
    key: keyof Pick<AlertPreferenceDto, "budgetAlerts" | "goalAlerts" | "subscriptionAlerts">;
    title: string;
    detail: string;
  }> = [
    { key: "budgetAlerts", title: "Budget", detail: "When a category exceeds its threshold." },
    { key: "goalAlerts", title: "Goals", detail: "When a deadline approaches or is overdue." },
    { key: "subscriptionAlerts", title: "Subscriptions", detail: "When a price increase is detected." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRingIcon className="size-4" /> {t("Active account alerts")}
        </CardTitle>
        <CardDescription>
          {t("{account} · these settings follow the selected account.", {
            account: `${data.account.icon} ${data.account.name}`,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div><p className="text-sm font-medium">{t(row.title)}</p><p className="text-xs text-muted-foreground">{t(row.detail)}</p></div>
              <Switch checked={value[row.key]} onCheckedChange={(checked) => set(row.key, checked)} />
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_150px] sm:items-end">
          <div className="flex items-start gap-3">
            <Switch checked={value.upcomingAlerts} onCheckedChange={(checked) => set("upcomingAlerts", checked)} />
            <div><p className="text-sm font-medium">{t("Upcoming deadlines")}</p><p className="text-xs text-muted-foreground">{t("Planned events within the selected number of days.")}</p></div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="upcoming-days">{t("Advance notice in days")}</Label>
            <Input id="upcoming-days" type="number" min={1} max={30} disabled={!value.upcomingAlerts} value={value.upcomingDays} onChange={(event) => set("upcomingDays", Number(event.target.value))} />
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_170px] sm:items-end">
          <div className="flex items-start gap-3">
            <Switch checked={value.lowBalanceEnabled} onCheckedChange={(checked) => set("lowBalanceEnabled", checked)} />
            <div><p className="text-sm font-medium">{t("Low balance")}</p><p className="text-xs text-muted-foreground">{t("Alert when the declared balance falls below the threshold.")}</p></div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="low-balance-threshold">{t("Balance threshold")}</Label>
            <Input id="low-balance-threshold" inputMode="decimal" disabled={!value.lowBalanceEnabled} value={value.lowBalanceThreshold} onChange={(event) => set("lowBalanceThreshold", Number(event.target.value.replace(",", ".")) || 0)} />
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_170px] sm:items-end">
          <div className="flex items-start gap-3">
            <Switch checked={value.unusualExpenseEnabled} onCheckedChange={(checked) => set("unusualExpenseEnabled", checked)} />
            <div><p className="text-sm font-medium">{t("High expense")}</p><p className="text-xs text-muted-foreground">{t("Flag recent movements above the selected amount.")}</p></div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="unusual-threshold">{t("Minimum amount")}</Label>
            <Input id="unusual-threshold" inputMode="decimal" disabled={!value.unusualExpenseEnabled} value={value.unusualExpenseThreshold} onChange={(event) => set("unusualExpenseThreshold", Number(event.target.value.replace(",", ".")) || 0)} />
          </div>
        </div>

        <div><Button onClick={save} disabled={saving}>{saving && <LoaderCircleIcon className="animate-spin" />}{t("Save alerts")}</Button></div>
      </CardContent>
    </Card>
  );
}
