"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlusIcon, LoaderCircleIcon, PencilIcon, Trash2Icon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryOption } from "@/components/transactions/transaction-dialog";
import { apiSend, useApiData } from "@/lib/api-client";
import { CURRENCIES, formatMoney } from "@/lib/currencies";
import { formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface EventItem {
  id: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  currency: string;
  description: string | null;
  notes: string | null;
  date: string;
  category: CategoryOption | null;
}

export function EventsSection({ baseCurrency }: { baseCurrency: string }) {
  const router = useRouter();
  const { intlLocale, t: tr } = useI18n();
  const events = useApiData<{ items: EventItem[] }>("/api/events");
  const categories = useApiData<{ items: CategoryOption[] }>("/api/categories", {
    silentError: true,
  });

  const items = events.data?.items ?? [];
  const catItems = categories.data?.items ?? [];
  const loading = events.loading;

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EventItem | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [type, setType] = React.useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [categoryId, setCategoryId] = React.useState("none");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState(baseCurrency);
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState("");

  function refresh() {
    events.refresh();
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setType("EXPENSE");
    setCategoryId(catItems.find((c) => c.type === "EXPENSE")?.id ?? "none");
    setAmount("");
    setCurrency(baseCurrency);
    setDescription("");
    const t = new Date();
    t.setDate(t.getDate() + 7);
    setDate(t.toISOString().slice(0, 10));
    setOpen(true);
  }

  function openEdit(e: EventItem) {
    setEditing(e);
    setType(e.type);
    setCategoryId(e.category?.id ?? "none");
    setAmount(String(e.amount));
    setCurrency(e.currency);
    setDescription(e.description ?? "");
    setDate(e.date);
    setOpen(true);
  }

  async function onSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!date) return toast.error(tr("Select a date"));
    const amt = Number(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error(tr("Invalid amount"));

    setSaving(true);
    const { ok, error } = await apiSend(
      editing ? `/api/events/${editing.id}` : "/api/events",
      editing ? "PATCH" : "POST",
      {
        type,
        categoryId: categoryId === "none" ? null : categoryId,
        amount: amt,
        currency,
        description: description.trim(),
        date,
      }
    );
    setSaving(false);
    if (!ok) return toast.error(tr(error ?? "Save failed"));

    toast.success(tr(editing ? "Event updated" : "Event scheduled"));
    setOpen(false);
    refresh();
  }

  async function onDelete(e: EventItem) {
    if (!confirm(tr("Delete the event \"{name}\"?", { name: e.description || e.date }))) return;
    const { ok } = await apiSend(`/api/events/${e.id}`, "DELETE");
    if (!ok) return toast.error(tr("Deletion failed"));
    toast.success(tr("Event deleted"));
    refresh();
  }

  const filteredCategories = catItems.filter((c) => c.type === type);
  const todayIso = new Date().toISOString().slice(0, 10);
  const future = items.filter((e) => e.date > todayIso);
  const dueToday = items.filter((e) => e.date <= todayIso);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{tr("Planned events")}</h2>
          <p className="text-sm text-muted-foreground">
            {tr("One-off future expenses or income, such as annual tax, insurance, or gifts. They become real transactions on the selected date.")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <CalendarPlusIcon />
          {tr("New event")}
        </Button>
      </div>

      <Card>
        <CardContent className="px-0">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" /> {tr("Loading…")}
            </p>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {tr("No planned events.")}
            </p>
          ) : (
            <ul className="divide-y">
              {[...future, ...dueToday].map((e) => {
                const isIncome = e.type === "INCOME";
                const isDue = e.date <= todayIso;
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        isDue ? "bg-primary/10" : "border border-dashed border-amber-400 bg-amber-500/5"
                      )}
                    >
                      {e.category?.icon ?? "📌"}
                    </span>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-medium">
                        {e.description || (e.category ? tr(e.category.name) : null) || tr(isIncome ? "Income" : "Expense")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDisplayDate(e.date, intlLocale)}
                        {isDue ? tr(" · due today") : ""}
                        {e.category ? ` · ${tr(e.category.name)}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : !isDue && "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {isIncome ? "+" : "−"}
                      {formatMoney(e.amount, e.currency, intlLocale)}
                    </span>
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={tr("Edit")}
                        onClick={() => openEdit(e)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label={tr("Delete")}
                        onClick={() => onDelete(e)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {tr(editing ? "Edit event" : "New planned event")}
            </DialogTitle>
            <DialogDescription>
              {tr("One-off: it will be converted into a transaction on the selected date.")}
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
              >
                {tr("Income")}
              </Button>
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ev-desc">{tr("Description")}</Label>
                <Input
                  id="ev-desc"
                  placeholder={tr("For example, annual car tax")}
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
                <Label htmlFor="ev-amount">{tr("Amount")}</Label>
                <Input
                  id="ev-amount"
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

            <div className="grid gap-2">
              <Label htmlFor="ev-date">{tr("Event date")}</Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
    </div>
  );
}
