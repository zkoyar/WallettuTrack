"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  Repeat2Icon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatMoney } from "@/lib/currencies";
import { apiSend, useApiData } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatDisplayDate, todayString } from "@/lib/dates";
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
  category: CategoryOption | null;
  account?: { id: string; name: string; color: string; icon: string } | null;
  tags: TagOption[];
}

interface Props {
  baseCurrency: string;
}

export function TransactionsClient({ baseCurrency }: Props) {
  const { intlLocale, t: tr } = useI18n();
  const categoriesData = useApiData<{ items: CategoryOption[] }>(
    "/api/categories",
    { silentError: true }
  );
  const categories = categoriesData.data?.items ?? [];
  const tagsData = useApiData<{ items: TagOption[] }>("/api/tags", {
    silentError: true,
  });
  const tags = tagsData.data?.items ?? [];
  const [items, setItems] = React.useState<TxItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  const [q, setQ] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [tagId, setTagId] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const pageSize = 25;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TransactionEditData | null>(null);
  const [deleting, setDeleting] = React.useState<TxItem | null>(null);
  const [upcoming, setUpcoming] = React.useState<UpcomingItem[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (q.trim()) params.set("q", q.trim());
      if (categoryId !== "all") params.set("categoryId", categoryId);
      if (type !== "all") params.set("type", type);
      if (tagId !== "all") params.set("tagId", tagId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error(tr("Could not load transactions"));
    } finally {
      setLoading(false);
    }
  }, [page, q, categoryId, type, tagId, from, to, tr]);

  React.useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Forecast occurrences from tomorrow through 90 days, constrained by date
  // filters when present.
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const today = todayString();
      const tomorrowDate = new Date(today + "T00:00:00Z");
      tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
      const tomorrow = tomorrowDate.toISOString().slice(0, 10);
      const horizonDate = new Date(today + "T00:00:00Z");
      horizonDate.setUTCDate(horizonDate.getUTCDate() + 90);
      const horizon = horizonDate.toISOString().slice(0, 10);

      const effFrom = from && from > tomorrow ? from : tomorrow;
      const effTo = to ? (to < horizon ? to : horizon) : horizon;

      if (effFrom > effTo) {
        if (alive) setUpcoming([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/recurrences/upcoming?from=${effFrom}&to=${effTo}`
        );
        const d = await res.json();
        if (alive) setUpcoming(d.items ?? []);
      } catch {
        if (alive) setUpcoming([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [from, to]);

  function resetFilters() {
    setQ("");
    setCategoryId("all");
    setType("all");
    setTagId("all");
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function handleDelete() {
    if (!deleting) return;
    const { ok } = await apiSend(`/api/transactions/${deleting.id}`, "DELETE");
    if (!ok) return toast.error(tr("Deletion failed"));
    toast.success(tr("Transaction deleted"));
    load();
    setDeleting(null);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  type Row = TxItem & { projected?: boolean };

  // Merge actual and forecast transactions in descending date order.
  const rows: Row[] = React.useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const filteredUp = upcoming.filter(
      (u) =>
        (type === "all" || u.type === type) &&
        (categoryId === "all" || u.category?.id === categoryId) &&
        (!qLower || (u.description ?? "").toLowerCase().includes(qLower))
    );
    const projectedRows: Row[] = filteredUp.map((u) => ({
      id: `up-${u.id}-${u.date}`,
      type: u.type,
      amount: u.amount,
      currency: u.currency,
      amountBase: u.amountBase,
      date: u.date,
      description: u.description,
      notes: null,
      recurrenceRuleId: u.id,
      category: u.category,
      tags: [],
      projected: true,
    }));
    return [...items, ...projectedRows].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [items, upcoming, type, categoryId, q]);

  const projectedCount = rows.filter((r) => r.projected).length;

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold md:text-2xl">{tr("Transactions")}</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <PlusIcon />
          {tr("New transaction")}
        </Button>
      </div>

      {/* Filters. */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[180px] flex-1">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tr("Search description or notes…")}
              className="pl-8"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
          </div>

          <Select
            value={type}
            onValueChange={(v) => {
              setPage(1);
              setType(v);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={tr("Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr("All types")}</SelectItem>
              <SelectItem value="EXPENSE">{tr("Expenses")}</SelectItem>
              <SelectItem value="INCOME">{tr("Income")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryId}
            onValueChange={(v) => {
              setPage(1);
              setCategoryId(v);
            }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder={tr("Category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr("All categories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {tr(c.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tags.length > 0 && (
            <Select
              value={tagId}
              onValueChange={(value) => {
                setPage(1);
                setTagId(value);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tr("Tag")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr("All tags")}</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            type="date"
            className="w-[150px]"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
            aria-label={tr("From")}
          />
          <Input
            type="date"
            className="w-[150px]"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
            aria-label={tr("To")}
          />

          <Button variant="ghost" size="sm" onClick={resetFilters}>
            {tr("Reset")}
          </Button>
        </CardContent>
      </Card>

          {projectedCount > 0 && (
            <div className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              <Repeat2Icon className="size-4 shrink-0" />
              {tr(
                "{count} forecast transactions included in the list (yellow dashed styling) — not yet occurred and generated by recurrence rules.",
                { count: projectedCount }
              )}
            </div>
          )}

          {/* Table. */}
          <Card>
            <CardContent className="px-0">
              {loading ? (
                <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  {tr("Loading…")}
                </p>
              ) : rows.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  {tr("No transactions found.")}
                </p>
              ) : (
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("Date")}</TableHead>
                  <TableHead>{tr("Description")}</TableHead>
                  <TableHead>{tr("Category")}</TableHead>
                  <TableHead className="text-right">{tr("Amount")}</TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    {tr("In {currency}", { currency: baseCurrency })}
                  </TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const isIncome = t.type === "INCOME";
                  return (
                    <TableRow
                      key={t.id}
                      className={cn(t.projected && "bg-amber-500/5")}
                    >
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDisplayDate(t.date, intlLocale)}
                        {t.projected && (
                          <span className="ml-1.5 rounded-sm border border-dashed border-amber-400 px-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            {tr("forecast")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className={cn("flex items-center gap-1.5 truncate", t.projected && "italic")}>
                          {t.description || "—"}
                          {(t.recurrenceRuleId) && (
                            <Repeat2Icon
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-label={tr("Recurring")}
                            />
                          )}
                        </span>
                        {t.tags.length > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {t.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full px-1.5 py-0.5 text-[10px]"
                                style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.category ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                            style={{ backgroundColor: t.category.color + "22" }}
                          >
                            {t.category.icon} {tr(t.category.name)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {t.account && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            {t.account.icon} {t.account.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold whitespace-nowrap tabular-nums",
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : t.projected && "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {isIncome && "+"}
                        {t.projected && !isIncome && "−"}
                        {formatMoney(t.amount, t.currency, intlLocale)}
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                        {formatMoney(t.amountBase, baseCurrency, intlLocale)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {t.projected ? (
                            <Link
                              href="/recurrences"
                              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-amber-600"
                              aria-label={tr("Manage recurrence rule")}
                              title={tr("Manage the recurrence rule that generates this forecast")}
                            >
                              <SettingsIcon className="size-4" />
                            </Link>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
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
                                    category: t.category,
                                    accountId: t.account?.id ?? null,
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
                                className="size-8"
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
                                category: t.category,
                                accountId: t.account?.id ?? null,
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
                                className="size-8 text-destructive hover:text-destructive"
                                aria-label={tr("Delete")}
                                onClick={() => setDeleting(t)}
                              >
                                <Trash2Icon />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {total > pageSize && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground tabular-nums">
                {tr("{total} results · page {page}/{pages}", {
                  total,
                  page,
                  pages: totalPages,
                })}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        baseCurrency={baseCurrency}
        transaction={editing}
        defaultDate={new Date().toISOString().slice(0, 10)}
        onSaved={() => load()}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Delete this transaction?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr("This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
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
