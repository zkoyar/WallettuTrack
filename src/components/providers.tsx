"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/components/i18n-provider";
import type { AppLocale } from "@/lib/i18n";

export function Providers({
  children,
  nonce,
  locale,
}: {
  children: React.ReactNode;
  nonce?: string;
  locale: AppLocale;
}) {
  return (
    <I18nProvider key={locale} initialLocale={locale}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        nonce={nonce}
      >
        {children}
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </I18nProvider>
  );
}
