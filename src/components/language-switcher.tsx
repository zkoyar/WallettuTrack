"use client";

import * as React from "react";
import { CheckIcon, LanguagesIcon, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n-provider";
import { LOCALE_OPTIONS, type AppLocale } from "@/lib/i18n";
import { invalidateApi } from "@/lib/api-client";

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [pending, startTransition] = React.useTransition();

  async function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale || pending) return;

    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("Locale update failed");

      invalidateApi();
      setLocale(nextLocale);
      startTransition(() => router.refresh());
    } catch {
      toast.error(t("Could not change language"));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Change language")}
          title={t("Change language")}
          disabled={pending}
        >
          {pending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <LanguagesIcon className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("Language")}</DropdownMenuLabel>
        {LOCALE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => changeLocale(option.value)}
          >
            <span className="flex-1">{option.label}</span>
            {option.value === locale && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
