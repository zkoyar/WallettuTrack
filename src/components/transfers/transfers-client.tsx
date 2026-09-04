"use client";

import * as React from "react";
import { ArrowDownLeftIcon, ArrowUpRightIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { apiSend, useApiData } from "@/lib/api-client";
import { formatMoney } from "@/lib/currencies";
import { formatDisplayDate, todayString } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/components/i18n-provider";

interface AccountItem {
  id: string;
  name: string;
  icon: string;
}

interface TransferItem {
  groupId: string;
  outTransactionId: string;
  inTransactionId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  fromAccount: AccountItem | null;
  toAccount: AccountItem | null;
}

export function TransfersClient({
  accounts,
  selectedAccountId,
  baseCurrency,
}: {
  accounts: AccountItem[];
  selectedAccountId: string;
  baseCurrency: string;
}) {
  const { intlLocale, t } = useI18n();
  const transfersApi = useApiData<{ items: TransferItem[] }>("/api/transfers");
  const selected = accounts.find((account) => account.id === selectedAccountId)!;
  const counterparties = accounts.filter((account) => account.id !== selectedAccountId);
  const [direction, setDirection] = React.useState<"out" | "in">("out");
  const [counterpartyId, setCounterpartyId] = React.useState(counterparties[0]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(todayString());
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return toast.error(t("Enter a valid amount"));
    if (!counterpartyId) return toast.error(t("Create a second account first"));

    const fromAccountId = direction === "out" ? selectedAccountId : counterpartyId;
    const toAccountId = direction === "out" ? counterpartyId : selectedAccountId;
    setSaving(true);
    const { ok, error } = await apiSend("/api/transfers", "POST", {
      fromAccountId,
      toAccountId,
      amount: value,
      date,
      description: description.trim(),
    });
    setSaving(false);
    if (!ok) return toast.error(t(error ?? "Transfer failed"));
    setAmount("");
    setDescription("");
    toast.success(t("Transfer recorded"));
    transfersApi.refresh();
  }

  async function remove(item: TransferItem) {
    if (!confirm(t("Delete both records for this transfer?"))) return;
    const { ok, error } = await apiSend(
      `/api/transactions/${item.outTransactionId}`,
      "DELETE"
    );
    if (!ok) return toast.error(t(error ?? "Deletion failed"));
    toast.success(t("Transfer deleted"));
    transfersApi.refresh();
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">{t("Transfers")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("{account} · move money without changing total income or expenses.", {
            account: `${selected.icon} ${selected.name}`,
          })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("New transfer")}</CardTitle>
          <CardDescription>
            {t("Two linked records are created, one for each account.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {counterparties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Create at least one more account in Settings before transferring money.")}
            </p>
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={direction === "out" ? "default" : "outline"}
                  onClick={() => setDirection("out")}
                >
                  <ArrowUpRightIcon /> {t("Outgoing")}
                </Button>
                <Button
                  type="button"
                  variant={direction === "in" ? "default" : "outline"}
                  onClick={() => setDirection("in")}
                >
                  <ArrowDownLeftIcon /> {t("Incoming")}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t(direction === "out" ? "From" : "To")}</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                    {selected.icon} {selected.name}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{t(direction === "out" ? "To" : "From")}</Label>
                  <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {counterparties.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.icon} {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="transfer-amount">{t("Amount ({currency})", { currency: baseCurrency })}</Label>
                  <Input
                    id="transfer-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="transfer-date">{t("Date")}</Label>
                  <Input id="transfer-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transfer-description">{t("Description")}</Label>
                <Input
                  id="transfer-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("For example, move to savings")}
                  maxLength={200}
                />
              </div>
              <div>
                <Button type="submit" disabled={saving}>
                  {saving && <LoaderCircleIcon className="animate-spin" />}
                  {t("Record transfer")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Recent transfers")}</CardTitle></CardHeader>
        <CardContent className="px-0">
          {transfersApi.loading ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" /> {t("Loading…")}
            </p>
          ) : (transfersApi.data?.items.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t("No transfers.")}</p>
          ) : (
            <ul className="divide-y">
              {transfersApi.data!.items.map((item) => (
                <li key={item.groupId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="w-20 text-xs text-muted-foreground tabular-nums">{formatDisplayDate(item.date, intlLocale)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.description || t("Internal transfer")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.fromAccount?.icon} {item.fromAccount?.name} → {item.toAccount?.icon} {item.toAccount?.name}
                    </p>
                  </div>
                  <strong className="tabular-nums">{formatMoney(item.amount, item.currency, intlLocale)}</strong>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => remove(item)} aria-label={t("Delete transfer")}>
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
