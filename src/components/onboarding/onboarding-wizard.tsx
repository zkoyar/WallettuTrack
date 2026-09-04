"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  LogOutIcon,
  TagsIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { CURRENCIES, formatMoney, getCurrencyDisplayName } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "EXPENSE" | "INCOME";
}

interface OnboardingWizardProps {
  user: { name: string; email: string; baseCurrency: string };
  account: { id: string; name: string; currentBalance: number };
  categories: CategoryItem[];
}

const STEPS = [
  { title: "Profile", icon: UserRoundIcon },
  { title: "Account", icon: WalletCardsIcon },
  { title: "Categories", icon: TagsIcon },
  { title: "Review", icon: CheckCircle2Icon },
];

export function OnboardingWizard({
  user,
  account,
  categories,
}: OnboardingWizardProps) {
  const router = useRouter();
  const { intlLocale, t } = useI18n();
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState(user.name);
  const [baseCurrency, setBaseCurrency] = React.useState(user.baseCurrency);
  const [accountName, setAccountName] = React.useState(account.name);
  const [balance, setBalance] = React.useState(String(account.currentBalance));
  const [selectedCategories, setSelectedCategories] = React.useState(
    () => new Set(categories.map((category) => category.id))
  );
  const [saving, setSaving] = React.useState(false);

  const expenseCategories = categories.filter(
    (category) => category.type === "EXPENSE"
  );
  const incomeCategories = categories.filter(
    (category) => category.type === "INCOME"
  );
  const balanceNumber = Number(balance.replace(",", "."));

  function toggleCategory(id: string) {
    setSelectedCategories((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setCategoryGroup(items: CategoryItem[], checked: boolean) {
    setSelectedCategories((current) => {
      const next = new Set(current);
      for (const item of items) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function goNext() {
    if (step === 0 && !name.trim()) {
      toast.error(t("Enter your name"));
      return;
    }
    if (step === 1) {
      if (!accountName.trim()) {
        toast.error(t("Enter an account name"));
        return;
      }
      if (!Number.isFinite(balanceNumber)) {
        toast.error(t("Enter a valid balance"));
        return;
      }
    }
    if (step === 2) {
      const selected = categories.filter((category) =>
        selectedCategories.has(category.id)
      );
      if (!selected.some((category) => category.type === "EXPENSE")) {
        toast.error(t("Choose at least one expense category"));
        return;
      }
      if (!selected.some((category) => category.type === "INCOME")) {
        toast.error(t("Choose at least one income category"));
        return;
      }
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  async function completeOnboarding() {
    setSaving(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          baseCurrency,
          accountId: account.id,
          accountName: accountName.trim(),
          currentBalance: balanceNumber,
          categoryIds: [...selectedCategories],
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(t(data?.error ?? "Setup failed"));
        return;
      }
      toast.success(t("Setup completed"));
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error(t("Connection error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-svh bg-muted/40 px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-lg font-semibold">WallettuTrack</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOutIcon />
            {t("Sign out")}
          </Button>
        </div>

        <Card className="min-h-[560px]">
          <CardHeader className="gap-4 border-b">
            <div>
              <CardTitle className="text-xl">{t("Set up your workspace")}</CardTitle>
              <CardDescription>
                {t("Four steps, then you can start managing your accounts.")}
              </CardDescription>
            </div>
            <Progress
              value={((step + 1) / STEPS.length) * 100}
              aria-label={t("Step {current} of {total}", {
                current: step + 1,
                total: STEPS.length,
              })}
            />
            <ol className="grid grid-cols-4 gap-2">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className={cn(
                      "flex min-w-0 flex-col items-center gap-1 text-center text-xs text-muted-foreground",
                      index <= step && "text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border bg-background",
                        index < step && "border-primary bg-primary text-primary-foreground",
                        index === step && "border-primary text-primary"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="truncate">{t(item.title)}</span>
                  </li>
                );
              })}
            </ol>
          </CardHeader>

          <CardContent className="flex-1 py-2">
            {step === 0 && (
              <section className="mx-auto grid max-w-lg gap-5 py-6">
                <div>
                  <h1 className="text-xl font-semibold">{t("Welcome to WallettuTrack")}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                      "Customize your profile and choose the currency used for totals and statistics."
                    )}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="onboarding-name">{t("What should we call you?")}</Label>
                  <Input
                    id="onboarding-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                    autoComplete="name"
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("Primary currency")}</Label>
                  <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} · {getCurrencyDisplayName(currency.code, intlLocale)} ({currency.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="mx-auto grid max-w-lg gap-5 py-6">
                <div>
                  <h1 className="text-xl font-semibold">{t("Your first account")}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                      "This can be your bank, Revolut, or wallet. You can add more later."
                    )}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="onboarding-account">{t("Account name")}</Label>
                  <Input
                    id="onboarding-account"
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    maxLength={40}
                    placeholder={t("Main account")}
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="onboarding-balance">{t("Current balance")}</Label>
                  <Input
                    id="onboarding-balance"
                    value={balance}
                    onChange={(event) => setBalance(event.target.value)}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "This is the starting point for forecasts. Negative balances are allowed."
                    )}
                  </p>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="grid gap-5 py-4">
                <div>
                  <h1 className="text-xl font-semibold">{t("Choose your categories")}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                      "Keep only the useful ones. At least one expense and one income category are required."
                    )}
                  </p>
                </div>
                <CategoryGroup
                  title={t("Expenses")}
                  items={expenseCategories}
                  selected={selectedCategories}
                  onToggle={toggleCategory}
                  onSetAll={(checked) => setCategoryGroup(expenseCategories, checked)}
                />
                <CategoryGroup
                  title={t("Income")}
                  items={incomeCategories}
                  selected={selectedCategories}
                  onToggle={toggleCategory}
                  onSetAll={(checked) => setCategoryGroup(incomeCategories, checked)}
                />
              </section>
            )}

            {step === 3 && (
              <section className="mx-auto grid max-w-lg gap-5 py-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2Icon className="size-6" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">{t("All set")}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                      "Review the summary. You can change these choices later in Settings."
                    )}
                  </p>
                </div>
                <dl className="grid gap-3 rounded-lg border p-4 text-sm">
                  <SummaryRow label={t("Profile")} value={name.trim()} />
                  <SummaryRow label={t("Currency")} value={baseCurrency} />
                  <SummaryRow label={t("Account")} value={accountName.trim()} />
                  <SummaryRow
                    label={t("Initial balance")}
                    value={formatMoney(balanceNumber, baseCurrency, intlLocale)}
                  />
                  <SummaryRow
                    label={t("Categories")}
                    value={t("{count} selected", {
                      count: selectedCategories.size,
                    })}
                  />
                </dl>
              </section>
            )}
          </CardContent>

          <CardFooter className="justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || saving}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              <ArrowLeftIcon />
              {t("Back")}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                {t("Continue")}
                <ArrowRightIcon />
              </Button>
            ) : (
              <Button type="button" disabled={saving} onClick={completeOnboarding}>
                {saving ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <CheckCircle2Icon />
                )}
                {t("Get started")}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

function CategoryGroup({
  title,
  items,
  selected,
  onToggle,
  onSetAll,
}: {
  title: string;
  items: CategoryItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSetAll: (checked: boolean) => void;
}) {
  const { t } = useI18n();
  const allSelected = items.every((item) => selected.has(item.id));
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onSetAll(!allSelected)}
        >
          {allSelected ? t("Deselect all") : t("Select all")}
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((category) => {
          const checked = selected.has(category.id);
          return (
            <label
              key={category.id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors",
                checked && "border-primary/60 bg-primary/5"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(category.id)}
                className="size-4 accent-[var(--primary)]"
              />
              <span className="text-base" aria-hidden>
                {category.icon}
              </span>
              <span className="min-w-0 truncate text-sm">{t(category.name)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
