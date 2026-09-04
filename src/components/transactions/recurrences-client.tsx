"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircleIcon, PencilIcon, PlusIcon, Repeat2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TransactionDialog,
  type CategoryOption,
} from "@/components/transactions/transaction-dialog";
import { EventsSection } from "@/components/transactions/events-section";
import { DetectedSubscriptions } from "@/components/transactions/detected-subscriptions";
import { apiSend, useApiData } from "@/lib/api-client";
import { CURRENCIES, formatMoney } from "@/lib/currencies";
import { formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface RecurrenceItem {
  id: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  currency: string;
  description: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  daysOfWeek: string | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  startDate: string;
  endDate: string | null;
  active: boolean;
  lastGeneratedDate: string | null;
  category: CategoryOption | null;
}

const FREQ_LABELS = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
} as const;

export function RecurrencesClient({
  baseCurrency,
}: {
  baseCurrency: string;
}) {
  const router = useRouter();
  const { intlLocale, t: tr } = useI18n();
  const recurrences = useApiData<{ items: RecurrenceItem[] }>("/api/recurrences");
  const categoriesData = useApiData<{ items: CategoryOption[] }>(
    "/api/categories",
    { silentError: true }
  );
  const items = recurrences.data?.items ?? [];
  const categories = categoriesData.data?.items ?? [];
  const loading = recurrences.loading;
  const [categoryId, setCategoryId] = React.useState("none");
  const [type, setType] = React.useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState(baseCurrency);
  const [description, setDescription] = React.useState("");
  const [frequency, setFrequency] =
    React.useState<keyof typeof FREQ_LABELS>("MONTHLY");
  const [interval, setIntervalN] = React.useState("1");
  const [selectedDays, setSelectedDays] = React.useState<number[]>([1]);
  const [dayOfMonth, setDayOfMonth] = React.useState("1");
  const [monthOfYear, setMonthOfYear] = React.useState("1");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  // Dialog for a manually generated transaction.
  const [txDialogOpen, setTxDialogOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurrenceItem | null>(null);

  const weekdayInitials = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, day) =>
        new Intl.DateTimeFormat(intlLocale, {
          weekday: "narrow",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, 0, 7 + day)))
      ),
    [intlLocale]
  );
  const weekdayNames = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, day) =>
        new Intl.DateTimeFormat(intlLocale, {
          weekday: "short",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, 0, 7 + day)))
      ),
    [intlLocale]
  );
  const monthNames = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        new Intl.DateTimeFormat(intlLocale, {
          month: "long",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, month, 1)))
      ),
    [intlLocale]
  );

  function describe(r: RecurrenceItem): string {
    switch (r.frequency) {
      case "DAILY":
        return r.interval === 1
          ? tr("Every day")
          : tr("Every {count} days", { count: r.interval });
      case "WEEKLY": {
        const days = (r.daysOfWeek ?? "")
          .split(",")
          .filter(Boolean)
          .map((day) => weekdayNames[Number(day)])
          .join(", ");
        const suffix = days ? ` · ${days}` : "";
        return r.interval === 1
          ? tr("Every week{days}", { days: suffix })
          : tr("Every {count} weeks{days}", {
              count: r.interval,
              days: suffix,
            });
      }
      case "MONTHLY":
        return r.interval === 1
          ? tr("Day {day} of each month", { day: r.dayOfMonth ?? 1 })
          : tr("Every {count} months · day {day}", {
              count: r.interval,
              day: r.dayOfMonth ?? 1,
            });
      case "YEARLY": {
        const month = monthNames[(r.monthOfYear ?? 1) - 1];
        return r.interval === 1
          ? new Intl.DateTimeFormat(intlLocale, {
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            }).format(
              new Date(Date.UTC(2024, (r.monthOfYear ?? 1) - 1, r.dayOfMonth ?? 1))
            )
          : tr("Every {count} years · {month} {day}", {
              count: r.interval,
              month,
              day: r.dayOfMonth ?? 1,
            });
      }
    }
  }

  function refresh() {
    recurrences.refresh();
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setType("EXPENSE");
    setCategoryId(categories.find((c) => c.type === "EXPENSE")?.id ?? "none");
    setAmount("");
    setCurrency(baseCurrency);
    setDescription("");
    setFrequency("MONTHLY");
    setIntervalN("1");
    setSelectedDays([1]);
    setDayOfMonth("1");
    setMonthOfYear(String(new Date().getMonth() + 1));
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setActive(true);
    setDialogOpen(true);
  }

  function openEdit(r: RecurrenceItem) {
    setEditing(r);
    setType(r.type);
    setCategoryId(r.category?.id ?? "none");
    setAmount(String(r.amount));
    setCurrency(r.currency);
    setDescription(r.description ?? "");
    setFrequency(r.frequency);
    setIntervalN(String(r.interval));
    setSelectedDays(
      (r.daysOfWeek ?? "").split(",").filter(Boolean).map(Number)
    );
    setDayOfMonth(String(r.dayOfMonth ?? 1));
    setMonthOfYear(String(r.monthOfYear ?? 1));
    setStartDate(r.startDate);
    setEndDate(r.endDate ?? "");
    setActive(r.active);
    setDialogOpen(true);
  }

  function toggleDay(d: number) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) {
      toast.error(tr("Select a start date"));
      return;
    }
    if (frequency === "WEEKLY" && selectedDays.length === 0) {
      toast.error(tr("Select at least one day of the week"));
      return;
    }
    const payload: Record<string, unknown> = {
      type,
      categoryId: categoryId === "none" ? null : categoryId,
      amount: Number(amount.replace(",", ".")),
      currency,
      description: description.trim(),
      frequency,
      interval: Number(interval) || 1,
      startDate,
      endDate: endDate || null,
      active,
    };
    if (frequency === "WEEKLY") payload.daysOfWeek = selectedDays.join(",");
    else delete payload.daysOfWeek;
    if (frequency === "MONTHLY" || frequency === "YEARLY")
      payload.dayOfMonth = Number(dayOfMonth) || 1;
    if (frequency === "YEARLY") payload.monthOfYear = Number(monthOfYear) || 1;

    setSaving(true);
    const { ok, error } = await apiSend(
      editing ? `/api/recurrences/${editing.id}` : "/api/recurrences",
      editing ? "PATCH" : "POST",
      payload
    );
    setSaving(false);
    if (!ok) return toast.error(tr(error ?? "Save failed"));

    toast.success(tr(editing ? "Rule updated" : "Rule created"));
    setDialogOpen(false);
    refresh();
  }

  async function toggleActive(r: RecurrenceItem) {
    const { ok } = await apiSend(`/api/recurrences/${r.id}`, "PATCH", {
      active: !r.active,
    });
    if (!ok) return toast.error(tr("Update failed"));
    refresh();
  }

  async function onDelete(r: RecurrenceItem) {
    if (!confirm(tr(
      "Delete the rule \"{name}\"? Previously generated transactions will remain.",
      { name: r.description || describe(r) }
    )))
      return;
    const { ok } = await apiSend(`/api/recurrences/${r.id}`, "DELETE");
    if (!ok) return toast.error(tr("Deletion failed"));
    toast.success(tr("Rule deleted"));
    refresh();
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{tr("Recurring transactions")}</h1>
          <p className="text-sm text-muted-foreground">
            {tr("Subscriptions, rent, salaries, and more, generated automatically when due")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          {tr("New rule")}
        </Button>
      </div>

      <DetectedSubscriptions onCreated={refresh} />

      <Card>
        <CardContent className="px-0">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" /> {tr("Loading…")}
            </p>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {tr("No recurrence rules. Create one to automate periodic transactions.")}
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: (r.category?.color ?? "#94a3b8") + "22",
                    }}
                  >
                    {r.category?.icon ?? "🔁"}
                  </span>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {r.description || (r.category ? tr(r.category.name) : null) || tr("Recurring item")}
                      {!r.active && (
                        <Badge variant="secondary" className="text-[10px]">
                          {tr("paused")}
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <Repeat2Icon className="mr-0.5 inline size-3" />
                      {tr("{schedule} · from {start}", {
                        schedule: describe(r),
                        start: formatDisplayDate(r.startDate, intlLocale),
                      })}
                      {r.endDate
                        ? tr(" to {end}", {
                            end: formatDisplayDate(r.endDate, intlLocale),
                          })
                        : ""}
                      {r.lastGeneratedDate
                        ? tr(" · last: {date}", {
                            date: formatDisplayDate(r.lastGeneratedDate, intlLocale),
                          })
                        : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      r.type === "INCOME" && "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {r.type === "INCOME" && "+"}
                    {formatMoney(r.amount, r.currency, intlLocale)}
                  </span>
                  <Switch
                    checked={r.active}
                    onCheckedChange={() => toggleActive(r)}
                    aria-label={tr(r.active ? "Pause" : "Enable")}
                  />
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={tr("Edit")}
                      onClick={() => openEdit(r)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={tr("Delete")}
                      onClick={() => onDelete(r)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Rule form. */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {tr(editing ? "Edit rule" : "New recurrence rule")}
            </DialogTitle>
            <DialogDescription>
              {tr("Transactions are generated automatically when their date arrives.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSave} className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === "EXPENSE" ? "default" : "outline"}
                onClick={() => setType("EXPENSE")}
              >
                {tr("Expense")}
              </Button>
              <Button
                type="button"
                variant={type === "INCOME" ? "default" : "outline"}
                onClick={() => setType("INCOME")}
                className={cn(type === "INCOME" && "bg-emerald-600 hover:bg-emerald-700 text-white")}
              >
                {tr("Income")}
              </Button>
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rec-desc">{tr("Description")}</Label>
                <Input
                  id="rec-desc"
                  placeholder={tr("For example, rent")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="grid gap-2">
                <Label>{tr("Currency")}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rec-amount">{tr("Amount")}</Label>
                <Input
                  id="rec-amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>{tr("Category")}</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tr("Category")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tr("None")}</SelectItem>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {tr(c.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>{tr("Frequency")}</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as keyof typeof FREQ_LABELS)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FREQ_LABELS) as (keyof typeof FREQ_LABELS)[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {tr(FREQ_LABELS[k])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rec-interval">{tr("Repeat every")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="rec-interval"
                    type="number"
                    min={1}
                    max={365}
                    value={interval}
                    onChange={(e) => setIntervalN(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {frequency === "DAILY"
                      ? tr(interval === "1" ? "day" : "days")
                      : frequency === "WEEKLY"
                        ? tr(interval === "1" ? "week" : "weeks")
                        : frequency === "MONTHLY"
                          ? tr(interval === "1" ? "month" : "months")
                          : tr(interval === "1" ? "year" : "years")}
                  </span>
                </div>
              </div>
            </div>

            {frequency === "WEEKLY" && (
              <div className="grid gap-2">
                <Label>{tr("Days of the week")}</Label>
                <div className="flex gap-1.5">
                  {weekdayInitials.map((g, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "size-9 rounded-md border text-sm font-medium transition-colors",
                        selectedDays.includes(i)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {frequency === "MONTHLY" && (
              <div className="grid gap-2">
                <Label htmlFor="rec-dom">{tr("Day of the month")}</Label>
                <Input
                  id="rec-dom"
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="w-28"
                />
                <p className="text-xs text-muted-foreground">
                  {tr("Shorter months use their final day.")}
                </p>
              </div>
            )}

            {frequency === "YEARLY" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>{tr("Month")}</Label>
                  <Select value={monthOfYear} onValueChange={setMonthOfYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rec-ydom">{tr("Day")}</Label>
                  <Input
                    id="rec-ydom"
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rec-start">{tr("Start")}</Label>
                <Input
                  id="rec-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rec-end">{tr("End (optional)")}</Label>
                <Input
                  id="rec-end"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="rec-active" className="cursor-pointer">
                {tr("Active rule")}
              </Label>
              <Switch id="rec-active" checked={active} onCheckedChange={setActive} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {tr("Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircleIcon className="animate-spin" />}
                {tr("Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        categories={categories}
        baseCurrency={baseCurrency}
        onSaved={() => {}}
      />

      <div className="mt-4 border-t pt-6">
        <EventsSection baseCurrency={baseCurrency} />
      </div>
    </div>
  );
}
