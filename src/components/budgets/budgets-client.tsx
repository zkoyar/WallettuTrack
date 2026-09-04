"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryOption } from "@/components/transactions/transaction-dialog";
import { GoalsSection } from "@/components/budgets/goals-section";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { formatDayMonth } from "@/lib/dates";
import { useI18n } from "@/components/i18n-provider";

export interface BudgetWithSpent {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  spent: number;
  period: "WEEKLY" | "MONTHLY" | "YEARLY";
  alertThreshold: number;
  /** End-of-period forecast based on the current spending rate. */
  projectedSpent?: number;
  /** Estimated date when the limit will be exceeded, when forecast. */
  overrunDate?: string | null;
}

const PERIOD_LABELS = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
} as const;

export function BudgetsClient({
  budgets,
  categories,
  baseCurrency,
  accountName,
}: {
  budgets: BudgetWithSpent[];
  categories: CategoryOption[];
  baseCurrency: string;
  accountName: string;
}) {
  const router = useRouter();
  const { intlLocale, t } = useI18n();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BudgetWithSpent | null>(null);
  const [deleting, setDeleting] = React.useState<BudgetWithSpent | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form state.
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [amount, setAmount] = React.useState("");
  const [period, setPeriod] = React.useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [alertThreshold, setAlertThreshold] = React.useState("80");

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  function openCreate() {
    setEditing(null);
    setCategoryId(expenseCategories[0]?.id ?? "");
    setAmount("");
    setPeriod("MONTHLY");
    setAlertThreshold("80");
    setDialogOpen(true);
  }

  function openEdit(b: BudgetWithSpent) {
    setEditing(b);
    setCategoryId(b.categoryId);
    setAmount(String(b.amount));
    setPeriod(b.period);
    setAlertThreshold(String(b.alertThreshold));
    setDialogOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error(t("Enter a valid amount"));
      return;
    }
    if (!categoryId) {
      toast.error(t("Select a category"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        categoryId,
        amount: amountNum,
        period,
        alertThreshold: Number(alertThreshold) || 80,
      };
      const res = await fetch(
        editing ? `/api/budgets/${editing.id}` : "/api/budgets",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(t(data?.error ?? "Save failed"));
        return;
      }
      toast.success(t(editing ? "Budget updated" : "Budget created"));
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error(t("Connection error"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/budgets/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("Budget deleted"));
      router.refresh();
    } catch {
      toast.error(t("Delete failed"));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{t("Budget")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("{account} · category spending limits and threshold alerts", {
              account: accountName,
            })}
          </p>
        </div>
        <Button onClick={openCreate} disabled={expenseCategories.length === 0}>
          <PlusIcon />
          {t("New budget")}
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {t("No budgets configured. Create one to monitor spending in a category.")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => {
            const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
            const roundedPct = Math.round(pct);
            const over = pct >= 100;
            const warn = !over && pct >= b.alertThreshold;
            return (
              <Card key={b.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: b.categoryColor + "22" }}
                      >
                        {b.categoryIcon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t(b.categoryName)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(PERIOD_LABELS[b.period])}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={t("Edit")}
                        onClick={() => openEdit(b)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        aria-label={t("Delete")}
                        onClick={() => setDeleting(b)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-1.5">
                    <div className="flex items-baseline justify-between text-sm tabular-nums">
                      <span className="font-semibold">{formatMoney(b.spent, baseCurrency, intlLocale)}</span>
                      <span className="text-muted-foreground">
                        {t("of {amount}", {
                          amount: formatMoney(b.amount, baseCurrency, intlLocale),
                        })}
                      </span>
                    </div>
                    <Progress value={Math.min(100, pct)} aria-label={`${roundedPct}%`} />
                    <p
                      className={cn(
                        "text-xs font-medium",
                        over
                          ? "text-red-500"
                          : warn
                            ? "text-orange-500"
                            : "text-muted-foreground"
                      )}
                    >
                      {over
                        ? t("Limit exceeded by {amount}", {
                            amount: formatMoney(b.spent - b.amount, baseCurrency, intlLocale),
                          })
                        : warn
                          ? t("Warning: {percent}% of the budget used", { percent: roundedPct })
                          : t("{amount} remaining ({percent}%)", {
                              amount: formatMoney(Math.max(0, b.amount - b.spent), baseCurrency, intlLocale),
                              percent: roundedPct,
                            })}
                    </p>
                    {typeof b.projectedSpent === "number" &&
                      b.projectedSpent > b.spent && (
                        <p
                          className={cn(
                            "flex flex-wrap items-center gap-1 text-[11px]",
                            b.overrunDate
                              ? "text-red-500"
                              : "text-muted-foreground"
                          )}
                        >
                          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-amber-400" />
                          {t("At this rate ≈ {amount} by the end of the {period}", {
                            amount: formatMoney(b.projectedSpent, baseCurrency, intlLocale),
                            period: t(PERIOD_LABELS[b.period]).toLocaleLowerCase(intlLocale),
                          })}
                          {b.overrunDate && (
                            <strong>
                              {t(" · forecast to exceed the limit on {date}", {
                                date: formatDayMonth(b.overrunDate, intlLocale),
                              })}
                            </strong>
                          )}
                        </p>
                      )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/edit dialog. */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t(editing ? "Edit budget" : "New budget")}</DialogTitle>
            <DialogDescription>
              {t("Set a spending limit for a category.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSave} className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t("Category")}</Label>
              <Select value={categoryId || undefined} onValueChange={setCategoryId} disabled={!!editing}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select a category")} />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {t(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="budget-amount">{t("Amount ({currency})", { currency: baseCurrency })}</Label>
                <Input
                  id="budget-amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("Period")}</Label>
                <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PERIOD_LABELS) as (keyof typeof PERIOD_LABELS)[]).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {t(PERIOD_LABELS[k])}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="threshold">{t("Alert threshold (%)")}</Label>
              <Input
                id="threshold"
                type="number"
                min={1}
                max={100}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircleIcon className="animate-spin" />}
                {t("Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-6 border-t pt-6">
        <GoalsSection baseCurrency={baseCurrency} />
      </div>

      {/* Deletion confirmation. */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete this budget?")}</DialogTitle>
            <DialogDescription>
              {t("The “{name}” budget will be removed. Transactions will not be changed.", {
                name: deleting?.categoryName ? t(deleting.categoryName) : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              {t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
