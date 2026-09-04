"use client";

import * as React from "react";
import { LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoneyCompact } from "@/lib/currencies";
import { useI18n } from "@/components/i18n-provider";

export interface AccountSwitcherItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentBalance: number;
}

export function AccountSwitcher({
  accounts,
  selectedAccountId,
  currency,
}: {
  accounts: AccountSwitcherItem[];
  selectedAccountId: string;
  currency: string;
}) {
  const { intlLocale, t } = useI18n();
  const [value, setValue] = React.useState(selectedAccountId);
  const [switching, setSwitching] = React.useState(false);
  const selected =
    accounts.find((account) => account.id === value) ?? accounts[0];

  async function onValueChange(accountId: string) {
    if (accountId === selectedAccountId || switching) return;
    const previous = value;
    setValue(accountId);
    setSwitching(true);

    try {
      const response = await fetch("/api/accounts/selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setValue(previous);
        toast.error(t(data?.error ?? "Could not switch account"));
        return;
      }

      // Reloading also clears client API caches and lets every widget restart
      // with the newly selected account.
      window.location.reload();
    } catch {
      setValue(previous);
      toast.error(t("Connection error while switching accounts"));
    } finally {
      setSwitching(false);
    }
  }

  if (!selected) return null;

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={switching || accounts.length < 2}
    >
      <SelectTrigger
        className="h-9 max-w-[92px] border-primary/20 bg-primary/5 sm:max-w-[220px]"
        aria-label={t("Active account")}
        title={
          accounts.length < 2
            ? t("Create another account in Settings before switching")
            : t("Switch active account")
        }
      >
        {switching ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <span aria-hidden>{selected.icon}</span>
        )}
        <SelectValue>
          <span className="truncate font-medium">{selected.name}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-64">
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <span aria-hidden>{account.icon}</span>
            <span className="min-w-0 flex-1 truncate">{account.name}</span>
            <span className="ml-3 text-xs tabular-nums text-muted-foreground">
              {formatMoneyCompact(account.currentBalance, currency, intlLocale)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
