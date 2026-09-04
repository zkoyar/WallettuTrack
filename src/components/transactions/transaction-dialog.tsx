"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { CURRENCIES } from "@/lib/currencies";
import { Button } from "@/components/ui/button";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

export interface CategoryOption {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: "EXPENSE" | "INCOME";
}

export interface TransactionEditData {
  /** Missing ID means duplicate mode: create a prefilled new transaction. */
  id?: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  currency: string;
  date: string;
  description?: string | null;
  notes?: string | null;
  category: CategoryOption | null;
  accountId?: string | null;
  tags?: TagOption[];
}

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

export interface AccountOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  baseCurrency: string;
  transaction?: TransactionEditData | null;
  defaultDate?: string;
  defaultAccountId?: string;
  onSaved?: () => void;
}

export function TransactionDialog({
  open,
  onOpenChange,
  categories,
  baseCurrency,
  transaction,
  defaultDate,
  defaultAccountId,
  onSaved,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open && (
          <TransactionForm
            key={transaction?.id ?? `new-${defaultDate ?? "today"}`}
            categories={categories}
            baseCurrency={baseCurrency}
            transaction={transaction ?? null}
            defaultDate={defaultDate}
            defaultAccountId={defaultAccountId}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  categories,
  baseCurrency,
  transaction,
  defaultDate,
  defaultAccountId,
  onClose,
  onSaved,
}: {
  categories: CategoryOption[];
  baseCurrency: string;
  transaction: TransactionEditData | null;
  defaultDate?: string;
  defaultAccountId?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const isEdit = !!transaction?.id;
  const isDuplicate = !!transaction && !isEdit;

  const [type, setType] = React.useState<"EXPENSE" | "INCOME">(
    transaction?.type ?? "EXPENSE"
  );
  const [categoryId, setCategoryId] = React.useState(
    () =>
      transaction?.category?.id ??
      (transaction
        ? "none"
        : categories.find((c) => c.type === "EXPENSE")?.id ?? "none")
  );
  const [amount, setAmount] = React.useState(
    transaction ? String(transaction.amount) : ""
  );
  const [currency, setCurrency] = React.useState(
    transaction?.currency ?? baseCurrency
  );
  const [date, setDate] = React.useState(
    transaction?.date ??
      defaultDate ??
      new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = React.useState(
    transaction?.description ?? ""
  );
  const [notes, setNotes] = React.useState(transaction?.notes ?? "");
  const [accounts, setAccounts] = React.useState<AccountOption[]>([]);
  const [tags, setTags] = React.useState<TagOption[]>([]);
  const [tagIds, setTagIds] = React.useState<string[]>(
    () => transaction?.tags?.map((tag) => tag.id) ?? []
  );
  const [accountId, setAccountId] = React.useState<string>(
    () => transaction?.accountId || defaultAccountId || "none"
  );
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [d, tagData] = await Promise.all([
          fetch("/api/accounts").then((r) => r.json()),
          fetch("/api/tags").then((r) => r.json()),
        ]);
        if (alive) {
          setAccounts(d.items ?? []);
          setTags(tagData.items ?? []);
          if (!transaction?.accountId) {
            setAccountId(defaultAccountId ?? d.selectedAccountId ?? "none");
          }
        }
      } catch {
        /* The form also works without accounts. */
      }
    })();
    return () => {
      alive = false;
    };
  }, [defaultAccountId, transaction?.accountId]);

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleTypeChange(t: "EXPENSE" | "INCOME") {
    setType(t);
    const current = categories.find((c) => c.id === categoryId);
    if (!current || current.type !== t) {
      setCategoryId(categories.find((c) => c.type === t)?.id ?? "none");
    }
  }

  function toggleTag(tagId: string) {
    setTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error(t("Enter a valid amount"));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        type,
        categoryId: categoryId === "none" ? null : categoryId,
        accountId: accountId === "none" ? defaultAccountId ?? null : accountId,
        amount: amountNum,
        currency,
        date,
        description: description.trim(),
        notes: notes.trim(),
        tagIds,
      };
      const res = await fetch(
        isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(t(data?.error ?? "Save failed"));
        return;
      }
      toast.success(t(isEdit ? "Transaction updated" : "Transaction saved"));
      onClose();
      router.refresh();
      onSaved?.();
    } catch {
      toast.error(t("Connection error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {t(isEdit ? "Edit transaction" : isDuplicate ? "Duplicate transaction" : "New transaction")}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? t("Update the transaction details.")
            : isDuplicate
              ? t("Copy of the transaction dated today: edit and save it.")
              : t("Record an expense or income transaction.")}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={type === "EXPENSE" ? "default" : "outline"}
            onClick={() => handleTypeChange("EXPENSE")}
          >
            {t("Expense")}
          </Button>
          <Button
            type="button"
            variant={type === "INCOME" ? "default" : "outline"}
            onClick={() => handleTypeChange("INCOME")}
            className={cn(type === "INCOME" && "bg-emerald-600 hover:bg-emerald-700 text-white")}
          >
            {t("Income")}
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="grid gap-2">
            <Label htmlFor="amount">{t("Amount")}</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("Currency")}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} {c.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>{t("Category")}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("Select a category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t(type === "EXPENSE" ? "Expenses" : "Income")}</SelectLabel>
                <SelectItem value="none">{t("None")}</SelectItem>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span>{c.icon}</span>
                      <span>{t(c.name)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="date">{t("Date")}</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {accounts.length > 0 && (
          <div className="grid gap-2">
            <Label>{t("Account")}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("Account")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.icon} {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="description">{t("Description")}</Label>
          <Input
            id="description"
            placeholder={t("For example, grocery shopping")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
        </div>

        {tags.length > 0 && (
          <div className="grid gap-2">
            <Label>{t("Tags and projects")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const selected = tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-opacity",
                      !selected && "opacity-45 hover:opacity-80"
                    )}
                    style={{
                      borderColor: tag.color,
                      backgroundColor: selected ? `${tag.color}22` : undefined,
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="notes">{t("Note")}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <LoaderCircle className="animate-spin" />}
            {t(isEdit ? "Save" : "Add")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
