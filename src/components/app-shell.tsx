"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ArrowLeftRightIcon,
  CalendarDaysIcon,
  ChartLineIcon,
  ChartPieIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PiggyBankIcon,
  PlusIcon,
  RepeatIcon,
  RefreshCwIcon,
  SettingsIcon,
  TagsIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransactionDialog, type CategoryOption } from "@/components/transactions/transaction-dialog";
import { NotificationsBell } from "@/components/notifications-bell";
import {
  AccountSwitcher,
  type AccountSwitcherItem,
} from "@/components/account-switcher";

export interface SessionUser {
  id: string;
  name?: string | null;
  email: string;
  baseCurrency: string;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRightIcon },
  { href: "/transfers", label: "Transfers", icon: RefreshCwIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/forecasts", label: "Forecasts", icon: ChartLineIcon },
  { href: "/statistics", label: "Statistics", icon: ChartPieIcon },
  { href: "/budgets", label: "Budget", icon: PiggyBankIcon },
  { href: "/recurrences", label: "Recurring items", icon: RepeatIcon },
  { href: "/categories", label: "Categories", icon: TagsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({
  user,
  accounts,
  selectedAccountId,
  children,
}: {
  user: SessionUser;
  accounts: AccountSwitcherItem[];
  selectedAccountId: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);

  async function openQuickAdd() {
    setDialogOpen(true);
    // Always reload categories to reflect recently created entries.
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.items ?? []);
    } catch {
      // The dialog also works without categories.
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:sticky md:top-0 md:flex md:h-svh md:self-start">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <WalletIcon className="size-4" />
          </span>
          <span className="font-semibold">WallettuTrack</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="size-4" />
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <div className="border-t p-2">
          <Button
            variant="default"
            className="w-full justify-start gap-3"
            onClick={openQuickAdd}
          >
            <PlusIcon className="size-4" />
            {t("New transaction")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <WalletIcon className="size-3.5" />
            </span>
            <span className="hidden font-semibold sm:inline">WallettuTrack</span>
          </Link>

          {/* Scrollable mobile navigation */}
          <nav className="ml-1 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex md:justify-end md:px-2 lg:hidden" />

          <div className="flex flex-1 items-center justify-end gap-1 md:flex-none">
            <AccountSwitcher
              key={selectedAccountId}
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              currency={user.baseCurrency}
            />
            <Button size="sm" onClick={openQuickAdd} className="gap-1.5 md:hidden lg:inline-flex">
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">{t("New")}</span>
            </Button>
            <NotificationsBell />
            <LanguageSwitcher />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(user.name ?? user.email)[0]?.toUpperCase()}
                  </span>
                  <span className="hidden max-w-[120px] truncate text-sm sm:inline">
                    {user.name ?? user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-medium">{user.name ?? "—"}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <SettingsIcon />
                    {t("Settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOutIcon />
                  {t("Sign out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Bottom mobile navigation */}
        <nav className="sticky top-14 z-30 flex items-center gap-1 overflow-x-auto border-b bg-background px-2 py-1.5 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
                pathname.startsWith(item.href)
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-3.5" />
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        baseCurrency={user.baseCurrency}
        defaultAccountId={selectedAccountId}
        onSaved={() => {}}
      />
    </div>
  );
}
