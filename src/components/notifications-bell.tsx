"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiSend, useApiData } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface NotificationItem {
  id: string;
  kind: "budget" | "event" | "goal" | "account" | "transaction" | "subscription";
  severity: "warning" | "danger" | "info";
  title: string;
  detail: string;
  href: string;
  read: boolean;
}

const KIND_ICON: Record<NotificationItem["kind"], string> = {
  budget: "💰",
  event: "📌",
  goal: "🎯",
  account: "🏦",
  transaction: "💳",
  subscription: "📈",
};

export function NotificationsBell() {
  const { t } = useI18n();
  // Poll every two minutes while the menu is closed.
  const { data, refresh } = useApiData<{
    items: NotificationItem[];
    unreadCount: number;
  }>(
    "/api/notifications",
    { silentError: true }
  );
  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const hasDanger = items.some((item) => !item.read && item.severity === "danger");

  async function markAllRead() {
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    if (ids.length === 0) return;
    const { ok } = await apiSend("/api/notifications", "PATCH", { ids });
    if (ok) refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("Unread notifications ({count})", {
            count: unreadCount,
          })}
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-background",
                hasDanger ? "bg-red-500 animate-pulse" : "bg-amber-500"
              )}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
          <p className="text-xs font-semibold text-muted-foreground">{t("Notifications")}</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheckIcon className="size-3.5" />
              {t("Mark all as read")}
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-muted-foreground">
            {t("All clear ✨ No alerts for the active account.")}
          </p>
        ) : (
          <ul className="max-h-[320px] overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href}
                  className={cn(
                    "flex gap-2.5 px-3 py-2.5 text-sm hover:bg-muted",
                    n.read && "opacity-60"
                  )}
                >
                  <span className="shrink-0">{KIND_ICON[n.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate font-medium",
                        n.severity === "danger" && "text-red-600 dark:text-red-400"
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {n.detail}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
