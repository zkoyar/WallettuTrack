"use client";

import * as React from "react";
import {
  getIntlLocale,
  translate,
  type AppLocale,
  type TranslationValues,
} from "@/lib/i18n";

interface I18nContextValue {
  locale: AppLocale;
  intlLocale: string;
  setLocale: (locale: AppLocale) => void;
  t: (message: string, values?: TranslationValues) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  const [locale, setLocale] = React.useState(initialLocale);

  React.useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem("wallettutrack-locale", locale);
    } catch {
      // Language selection still works when browser storage is disabled.
    }
  }, [locale]);

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      intlLocale: getIntlLocale(locale),
      setLocale,
      t: (message, values) => translate(locale, message, values),
    }),
    [locale]
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nContextValue {
  const context = React.use(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
