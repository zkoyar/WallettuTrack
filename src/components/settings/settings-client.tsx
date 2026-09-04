"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  DownloadIcon,
  LoaderCircleIcon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, formatMoney, getCurrencyDisplayName } from "@/lib/currencies";
import { apiSend, useApiData } from "@/lib/api-client";
import { TagsSettingsCard } from "@/components/settings/tags-settings-card";
import { AlertPreferencesCard } from "@/components/settings/alert-preferences-card";
import { ImportCsvCard } from "@/components/settings/import-csv-card";
import { useI18n } from "@/components/i18n-provider";

interface AccountItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentBalance: number;
}

export function SettingsClient({
  user,
}: {
  user: {
    name?: string | null;
    email: string;
    baseCurrency: string;
    baseCurrencyLocked: boolean;
  };
}) {
  const router = useRouter();
  const { intlLocale, t } = useI18n();
  const [name, setName] = React.useState(user.name ?? "");
  const [baseCurrency, setBaseCurrency] = React.useState(user.baseCurrency);
  const [savingProfile, setSavingProfile] = React.useState(false);

  // Password change.
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  // Danger zone.
  const [deleteConfirmEmail, setDeleteConfirmEmail] = React.useState("");
  const [deleteCurrentPassword, setDeleteCurrentPassword] = React.useState("");
  const [restoreCurrentPassword, setRestoreCurrentPassword] = React.useState("");
  const [restoringBackup, setRestoringBackup] = React.useState(false);
  const backupFileRef = React.useRef<HTMLInputElement>(null);

  // Accounts.
  const accountsApi = useApiData<{ items: AccountItem[] }>("/api/accounts");
  const accounts = accountsApi.data?.items ?? [];
  const [newAccName, setNewAccName] = React.useState("");
  const [newAccBalance, setNewAccBalance] = React.useState("");

  function refreshAccounts() {
    accountsApi.refresh();
    router.refresh();
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccName.trim()) return toast.error(t("Enter a name"));
    const { ok, error } = await apiSend("/api/accounts", "POST", {
      name: newAccName.trim(),
      currentBalance: Number(newAccBalance.replace(",", ".")) || 0,
    });
    if (!ok) return toast.error(t(error ?? "Creation failed"));
    toast.success(t("Account added"));
    setNewAccName("");
    setNewAccBalance("");
    refreshAccounts();
  }

  async function updateAccountBalance(a: AccountItem, value: string) {
    const v = Number(value.replace(",", "."));
    if (!Number.isFinite(v)) return;
    const { ok } = await apiSend("/api/accounts", "PATCH", {
      id: a.id,
      currentBalance: v,
    });
    if (!ok) return toast.error(t("Update failed"));
    toast.success(t("Balance for \"{name}\" updated", { name: a.name }));
    refreshAccounts();
  }

  async function deleteAccount(a: AccountItem) {
    if (
      !confirm(
        t("Delete the account \"{name}\"? This is allowed only when it contains no data.", {
          name: a.name,
        })
      )
    )
      return;
    const { ok, error } = await apiSend(`/api/accounts?id=${a.id}`, "DELETE");
    if (!ok) return toast.error(t(error ?? "Deletion failed"));
    toast.success(t("Account deleted"));
    refreshAccounts();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          baseCurrency,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(t(data?.error ?? "Save failed"));
        return;
      }
      toast.success(t("Settings saved"));
      router.refresh();
    } catch {
      toast.error(t("Connection error"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("The new passwords do not match"));
      return;
    }
    setSavingPassword(true);
    const { ok, error } = await apiSend("/api/settings/password", "PATCH", {
      currentPassword,
      newPassword,
    });
    setSavingPassword(false);
    if (!ok) return toast.error(t(error ?? "Password change failed"));
    toast.success(t("Password updated"));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    await signOut({ callbackUrl: "/login" });
  }

  async function onDeleteAccount() {
    if (deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      toast.error(t("Enter the correct email address to confirm"));
      return;
    }
    if (!deleteCurrentPassword) {
      toast.error(t("Enter your current password"));
      return;
    }
    const { ok, error } = await apiSend("/api/account", "DELETE", {
      confirmEmail: deleteConfirmEmail.trim(),
      currentPassword: deleteCurrentPassword,
    });
    if (!ok) return toast.error(t(error ?? "Deletion failed"));
    toast.success(t("Account deleted. Goodbye!"));
    signOut({ callbackUrl: "/login" });
  }

  async function onRestoreBackup(file: File) {
    if (!restoreCurrentPassword) {
      toast.error(t("Enter your current password"));
      if (backupFileRef.current) backupFileRef.current.value = "";
      return;
    }
    if (
      !confirm(
        t("Restoring will replace all current data with the backup. Continue?")
      )
    ) {
      if (backupFileRef.current) backupFileRef.current.value = "";
      return;
    }

    setRestoringBackup(true);
    try {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(t("The backup exceeds the 15 MB limit"));
        return;
      }
      const backup = JSON.parse(await file.text()) as unknown;
      const { ok, data, error } = await apiSend<{
        ok: true;
        counts: { transactions: number };
      }>("/api/import/backup", "POST", {
        mode: "replace",
        confirmEmail: user.email,
        currentPassword: restoreCurrentPassword,
        backup,
      });
      if (!ok) return toast.error(t(error ?? "Restore failed"));
      toast.success(t("Backup restored: {count} transactions", {
        count: data?.counts.transactions ?? 0,
      }));
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast.error(t("Invalid JSON backup file"));
    } finally {
      setRestoringBackup(false);
      setRestoreCurrentPassword("");
      if (backupFileRef.current) backupFileRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <h1 className="text-xl font-semibold md:text-2xl">{t("Settings")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Profile")}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="settings-name">{t("Name")}</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("Primary currency")}</Label>
              <Select
                value={baseCurrency}
                onValueChange={setBaseCurrency}
                disabled={user.baseCurrencyLocked}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} · {getCurrencyDisplayName(c.code, intlLocale)} ({c.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {user.baseCurrencyLocked
                  ? t("The currency is locked because balances or movements already exist; changing it would reinterpret historical data.")
                  : t("Transactions in other currencies are converted to this currency for totals and statistics.")}
              </p>
            </div>
            <div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile && <LoaderCircleIcon className="animate-spin" />}
                {t("Save profile")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Accounts")}</CardTitle>
          <CardDescription>
            {t("Keep balances and movements separate for Revolut, banks, cash, and other accounts. Use the top-bar selector to switch the account shown throughout the app.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {accounts.length > 0 && (
            <ul className="grid gap-2">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5"
                >
                  <span className="text-lg">{a.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {a.name}
                  </span>
                  <Input
                    defaultValue={String(a.currentBalance)}
                    inputMode="decimal"
                    className="w-32 text-right tabular-nums"
                    aria-label={t("Balance {name}", { name: a.name })}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== String(a.currentBalance)) {
                        updateAccountBalance(a, v);
                      }
                    }}
                  />
                  <button
                    onClick={() => deleteAccount(a)}
                    className="px-1 text-muted-foreground hover:text-destructive"
                    aria-label={t("Delete {name}", { name: a.name })}
                  >
                    ×
                  </button>
                </li>
              ))}
              <li className="flex items-center justify-end gap-2 px-1 pt-1 text-sm text-muted-foreground tabular-nums">
                {t("Total across accounts:")}{" "}
                <strong className="text-foreground">
                  {formatMoney(
                    accounts.reduce((s, a) => s + a.currentBalance, 0),
                    baseCurrency,
                    intlLocale
                  )}
                </strong>
              </li>
            </ul>
          )}

          <form onSubmit={addAccount} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1">
              <Input
                placeholder={t("Account name (for example, Revolut)")}
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="w-32">
              <Input
                inputMode="decimal"
                placeholder={t("Balance")}
                value={newAccBalance}
                onChange={(e) => setNewAccBalance(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={!newAccName.trim()}>
              {t("Add account")}
            </Button>
          </form>
          <div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reconciliation">{t("Reconcile active account")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <TagsSettingsCard />

      <AlertPreferencesCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Data export")}</CardTitle>
          <CardDescription>
            {t("Download all transactions as CSV, compatible with Excel and Google Sheets.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/api/export" download>
              <DownloadIcon />
              {t("Export CSV")}
            </a>
          </Button>
        </CardContent>
      </Card>

      <ImportCsvCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Security")}</CardTitle>
          <CardDescription>{t("Change your sign-in password")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cur-pass">{t("Current password")}</Label>
              <Input
                id="cur-pass"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                maxLength={128}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="new-pass">{t("New password")}</Label>
                <Input
                  id="new-pass"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="conf-pass">{t("Confirm new password")}</Label>
                <Input
                  id="conf-pass"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Button type="submit" variant="outline" disabled={savingPassword}>
                {savingPassword && <LoaderCircleIcon className="animate-spin" />}
                {t("Update password")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t("Danger zone")}</CardTitle>
          <CardDescription>
            {t("Irreversible actions. Export a backup first if you are unsure.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t("Complete backup (JSON)")}</p>
              <p className="text-xs text-muted-foreground">
                {t("All your data in a readable file.")}
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/api/export/json" download>{t("Download backup")}</a>
            </Button>
          </div>

          <div className="grid gap-3 rounded-lg border border-amber-500/30 p-3">
            <div>
              <p className="text-sm font-medium">{t("Restore JSON backup")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Replaces categories, transactions, accounts, budgets, goals, recurring items, and events with the file contents.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="restore-current-password"
                type="password"
                autoComplete="current-password"
                placeholder={t("Current password")}
                value={restoreCurrentPassword}
                onChange={(event) => setRestoreCurrentPassword(event.target.value)}
                maxLength={128}
                className="max-w-xs"
                disabled={restoringBackup}
              />
              <Input
                ref={backupFileRef}
                type="file"
                accept=".json,application/json"
                className="max-w-md"
                disabled={restoringBackup}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onRestoreBackup(file);
                }}
              />
              {restoringBackup && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  {t("Restoring…")}
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <UploadIcon className="size-3.5" />
              {t("Restore is atomic: current data remains unchanged if an error occurs.")}
            </p>
          </div>

          <div className="grid gap-2 rounded-lg border border-destructive/30 p-3">
            <p className="text-sm font-medium">{t("Permanently delete account")}</p>
            <p className="text-xs text-muted-foreground">
              {t("Transactions, categories, budgets, goals, recurring items, and accounts will be removed. Enter {email} to confirm.", {
                email: user.email,
              })}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                placeholder={user.email}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                className="max-w-xs"
              />
              <Input
                type="password"
                autoComplete="current-password"
                placeholder={t("Current password")}
                value={deleteCurrentPassword}
                onChange={(event) => setDeleteCurrentPassword(event.target.value)}
                maxLength={128}
                className="max-w-xs"
              />
              <Button
                variant="destructive"
                disabled={
                  deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase() ||
                  !deleteCurrentPassword
                }
                onClick={onDeleteAccount}
              >
                {t("Delete forever")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
