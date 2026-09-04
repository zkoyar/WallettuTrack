"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  Repeat2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TransactionDialog,
  type CategoryOption,
  type TagOption,
  type TransactionEditData,
} from "@/components/transactions/transaction-dialog";
import { formatMoneyCompact, formatMoney } from "@/lib/currencies";
import {
  formatDisplayDate,
  todayString,
} from "@/lib/dates";
import { apiSend, useApiData } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { UpcomingItem } from "@/lib/upcoming";
import { useI18n } from "@/components/i18n-provider";

interface TxItem {
  id: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  currency: string;
  amountBase: number;
  date: string;
  description: string | null;
  notes: string | null;
  recurrenceRuleId: string | null;
  account?: { id: string; name: string; color: string; icon: string } | null;
  category: CategoryOption | null;
  tags: TagOption[];
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarClient({
  baseCurrency,
}: {
  baseCurrency: string;
}) {
  const router = useRouter();
  const { intlLocale, t: tr } = useI18n();
  const now = new Date();
  const [viewYear, setViewYear] = React.useState(now.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(now.getMonth());
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TransactionEditData | null>(null);
  const [deleting, setDeleting] = React.useState<TxItem | null>(null);
  const calendarData = useApiData<{ items: TxItem[]; total: number }>(
    `/api/transactions/calendar?year=${viewYear}&month=${viewMonth + 1}`
  );
  const txs = React.useMemo(
    () => calendarData.data?.items ?? [],
    [calendarData.data]
  );
  const loading = calendarData.loading;
  const categoriesData = useApiData<{ items: CategoryOption[] }>(
    "/api/categories",
    { silentError: true }
  );
  const categories = categoriesData.data?.items ?? [];
  const [upcoming, setUpcoming] = React.useState<UpcomingItem[]>([]);

  const todayIso = todayString();
  const weekdays = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(intlLocale, {
          weekday: "short",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, 0, 8 + index)))
      ),
    [intlLocale]
  );
  const calendarHeading = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(viewYear, viewMonth, 1)));

  // Forecast occurrences in the displayed month.
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const monthStart = isoDate(viewYear, viewMonth, 1);
      const lastDay = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
      const monthEnd = isoDate(viewYear, viewMonth, lastDay);

      // Only the future portion of the month, starting tomorrow.
      const from = monthStart > todayIso ? monthStart : todayIso;
      if (from >= monthEnd) {
        if (alive) setUpcoming([]);
        return;
      }
      try {
        const res = await fetch(`/api/recurrences/upcoming?from=${from}&to=${monthEnd}`);
        const d = await res.json();
        if (alive) setUpcoming(d.items ?? []);
      } catch {
        if (alive) setUpcoming([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [viewYear, viewMonth, todayIso]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  // Group by day.
  const byDay = React.useMemo(() => {
    const map = new Map<string, TxItem[]>();
    for (const t of txs) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return map;
  }, [txs]);

  const monthTotals = React.useMemo(() => {
    let out = 0;
    let inc = 0;
    for (const t of txs) {
      if (t.type === "EXPENSE") out += t.amountBase;
      else inc += t.amountBase;
    }
    return { out, inc };
  }, [txs]);

  // Forecast occurrences grouped by day.
  const upcomingByDay = React.useMemo(() => {
    const map = new Map<string, UpcomingItem[]>();
    for (const u of upcoming) {
      const arr = map.get(u.date) ?? [];
      arr.push(u);
      map.set(u.date, arr);
    }
    return map;
  }, [upcoming]);

  // Forecast from today through month end, future only.
  const projected = React.useMemo(() => {
    let out = 0;
    let inc = 0;
    for (const u of upcoming) {
      if (u.type === "EXPENSE") out += u.amountBase;
      else inc += u.amountBase;
    }
    return { out, inc, count: upcoming.length };
  }, [upcoming]);

  // Month grid from Monday through Sunday.
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedTxs = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const selectedUpcoming = selectedDay ? upcomingByDay.get(selectedDay) ?? [] : [];

  async function handleDelete() {
    if (!deleting) return;
    const { ok, error } = await apiSend(
      `/api/transactions/${deleting.id}`,
      "DELETE"
    );
    if (!ok) return toast.error(tr(error ?? "Deletion failed"));
    setDeleting(null);
    await calendarData.refresh();
    router.refresh();
    toast.success(tr("Transaction deleted"));
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold md:text-2xl">
          {tr("Calendar")} · {calendarHeading}
        </h1>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={prevMonth}>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setViewYear(now.getFullYear());
              setViewMonth(now.getMonth());
            }}
          >
            {tr("Today")}
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={nextMonth}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          {tr("Expenses")}:{" "}
          <strong className="text-foreground tabular-nums">
            {formatMoney(monthTotals.out, baseCurrency, intlLocale)}
          </strong>
        </span>
        <span className="text-muted-foreground">
          {tr("Income")}:{" "}
          <strong className="text-emerald-600 tabular-nums dark:text-emerald-400">
            {formatMoney(monthTotals.inc, baseCurrency, intlLocale)}
          </strong>
        </span>
        {projected.count > 0 && (
          <span className="rounded-md border border-dashed border-amber-400 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
            {tr("Forecast from tomorrow through month end:")}{" "}
            <strong className="tabular-nums">
              −{formatMoneyCompact(projected.out, baseCurrency, intlLocale)}
            </strong>
            {projected.inc > 0 && (
              <> / +{formatMoneyCompact(projected.inc, baseCurrency, intlLocale)}</>
            )}
            <span className="ml-1 opacity-70">
              ({projected.count} {tr(projected.count === 1 ? "transaction" : "Transactions").toLocaleLowerCase(intlLocale)})
            </span>
          </span>
        )}
      </div>

      <Card>
        <CardContent className="px-2 py-3 sm:px-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekdays.map((g) => (
              <div key={g} className="py-1.5 font-medium">
                <span className="sm:hidden">{g[0]}</span>
                <span className="hidden sm:inline">{g}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, i) => {
              if (!iso) return <div key={`e-${i}`} className="min-h-[72px] rounded-md bg-muted/30 sm:min-h-[96px]" />;
              const dayTxs = byDay.get(iso) ?? [];
              const dayOut = dayTxs
                .filter((t) => t.type === "EXPENSE")
                .reduce((s, t) => s + t.amountBase, 0);
              const dayInc = dayTxs
                .filter((t) => t.type === "INCOME")
                .reduce((s, t) => s + t.amountBase, 0);
              const dots = [
                ...new Map(
                  dayTxs
                    .filter((t) => t.category)
                    .map((t) => [t.category!.id, t.category!])
                ).values(),
              ].slice(0, 3);
              const extra = new Set(
                dayTxs.filter((t) => t.category).map((t) => t.category!.id)
              ).size - dots.length;

              const dayUpcoming = upcomingByDay.get(iso) ?? [];
              const upOut = dayUpcoming
                .filter((u) => u.type === "EXPENSE")
                .reduce((s, u) => s + u.amountBase, 0);
              const isFutureDay = iso > todayIso;

              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDay(iso)}
                  className={cn(
                    "flex min-h-[72px] flex-col items-start gap-0.5 rounded-md border p-1.5 text-left transition-colors hover:bg-muted/60 sm:min-h-[96px]",
                    iso === todayIso && "border-primary ring-1 ring-primary",
                    isFutureDay && "bg-muted/20"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      iso === todayIso ? "font-bold text-primary" : "text-muted-foreground"
                    )}
                  >
                    {Number(iso.slice(8))}
                  </span>
                  {dayOut > 0 && (
                    <span className="w-full truncate text-left text-[10px] font-medium text-red-500 sm:text-[11px]">
                      −{formatMoneyCompact(dayOut, baseCurrency, intlLocale)}
                    </span>
                  )}
                  {dayInc > 0 && (
                    <span className="w-full truncate text-left text-[10px] font-medium text-emerald-600 sm:text-[11px] dark:text-emerald-400">
                      +{formatMoneyCompact(dayInc, baseCurrency, intlLocale)}
                    </span>
                  )}
                  {upOut > 0 && (
                    <span
                      className="w-full truncate rounded-sm border border-dashed border-amber-400 px-1 text-left text-[10px] font-medium text-amber-600 sm:text-[11px] dark:text-amber-400"
                      title={tr("Forecast, not yet occurred")}
                    >
                      −{formatMoneyCompact(upOut, baseCurrency, intlLocale)}
                    </span>
                  )}
                  <span className="mt-auto flex items-center gap-0.5">
                    {dots.map((c) => (
                      <span
                        key={c.id}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                    ))}
                    {dayUpcoming.length > 0 && (
                      <span
                        className="inline-block size-1.5 rounded-full border border-dashed border-amber-400 bg-amber-400/40"
                          title={tr("Forecast transactions")}
                      />
                    )}
                    {extra > 0 && (
                      <span className="text-[9px] text-muted-foreground">+{extra}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {loading && (
          <p className="pt-2 text-center text-xs text-muted-foreground">{tr("Loading…")}</p>
          )}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-5 border-t-2 border-dashed border-amber-400" />
              {tr("yellow dashed = forecast recurring item, not yet occurred")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-red-500/70" /> {tr("recorded expenses")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-emerald-500/70" /> {tr("recorded income")}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Day dialog. */}
      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDay && formatDisplayDate(selectedDay, intlLocale)}</DialogTitle>
            <DialogDescription>
              {selectedTxs.length === 0 && selectedUpcoming.length === 0
              ? tr("No transactions on this day.")
              : tr("{count} transactions", { count: selectedTxs.length }) +
                (selectedUpcoming.length > 0
                  ? tr(" · {count} forecast", {
                      count: selectedUpcoming.length,
                    })
                  : "")}
            </DialogDescription>
          </DialogHeader>

          {selectedUpcoming.length > 0 && (
            <div className="grid gap-2">
              <p className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                <span className="inline-block h-0 w-6 border-t-2 border-dashed border-amber-400" />
                {tr("Forecast (not yet occurred)")}
              </p>
              <ul className="grid gap-2">
                {selectedUpcoming.map((u) => {
                  const isIncome = u.type === "INCOME";
                  return (
                    <li
                      key={u.id + u.date}
                      className="flex items-center gap-3 rounded-lg border border-dashed border-amber-400 bg-amber-500/5 p-2.5"
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                        style={{
                          backgroundColor: (u.category?.color ?? "#f59e0b") + "22",
                        }}
                      >
                        {u.category?.icon ?? "📅"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {u.description || (u.category ? tr(u.category.name) : null) || tr(isIncome ? "Forecast income" : "Forecast expense")}
                        </p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Repeat2Icon className="size-3 shrink-0" />
                          {tr("Recurring")} · {u.category ? tr(u.category.name) : tr("Uncategorized")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {isIncome ? "+" : "−"}
                        {formatMoney(u.amountBase, baseCurrency, intlLocale)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/recurrences"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {tr("Manage recurrence rules →")}
              </Link>
            </div>
          )}

          {selectedTxs.length > 0 && (
            <ul className={cn("grid max-h-[50vh] gap-2 overflow-y-auto pr-1", selectedUpcoming.length > 0 && "max-h-[35vh]")}>
            {selectedTxs.map((t) => {
              const isIncome = t.type === "INCOME";
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border p-2.5"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                    style={{
                      backgroundColor: (t.category?.color ?? "#94a3b8") + "22",
                    }}
                  >
                    {t.category?.icon ?? "📦"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-medium">
                      {t.description || (t.category ? tr(t.category.name) : null) || tr(isIncome ? "Income" : "Expense")}
                      {t.recurrenceRuleId && (
                        <Repeat2Icon className="size-3 shrink-0 text-muted-foreground" />
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.category ? tr(t.category.name) : tr("Uncategorized")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      isIncome && "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {isIncome ? "+" : ""}
                    {formatMoney(t.amount, t.currency, intlLocale)}
                  </span>
                   <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={tr("Duplicate")}
                      title={tr("Duplicate with today's date")}
                      onClick={() => {
                        setEditing({
                          type: t.type,
                          amount: t.amount,
                          currency: t.currency,
                          date: todayString(),
                          description: t.description,
                          notes: t.notes,
                          accountId: t.account?.id ?? null,
                          category: t.category,
                          tags: t.tags,
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <CopyIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={tr("Edit")}
                      onClick={() => {
                        setEditing({
                          id: t.id,
                          type: t.type,
                          amount: t.amount,
                          currency: t.currency,
                          date: t.date,
                          description: t.description,
                          notes: t.notes,
                          accountId: t.account?.id ?? null,
                          category: t.category,
                          tags: t.tags,
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      aria-label={tr("Delete")}
                      onClick={() => setDeleting(t)}
                    >
                      ×
                    </Button>
                  </div>
                 </li>
               );
             })}
          </ul>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <PlusIcon />
            {tr("Add on {date}", {
              date: selectedDay ? formatDisplayDate(selectedDay, intlLocale) : "",
            })}
          </Button>
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        categories={categories}
        baseCurrency={baseCurrency}
        transaction={editing}
        defaultDate={selectedDay ?? undefined}
        onSaved={() => {
          setSelectedDay(null);
          void calendarData.refresh();
          router.refresh();
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Delete this transaction?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.description
                ? tr("You are about to delete “{name}”. This action cannot be undone.", {
                    name: deleting.description,
                  })
                : tr("This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {tr("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
