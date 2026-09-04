import { cache } from "react";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveLocale,
  resolvePreferredLocale,
  translate,
  type AppLocale,
  type TranslationValues,
} from "@/lib/i18n";

export const getServerLocale = cache(async (): Promise<AppLocale> => {
  const cookieStore = await cookies();
  const cookieLocale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  if (cookieLocale) return cookieLocale;

  const session = await auth();
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { locale: true },
    });
    // en-GB is also the database default for accounts that have never made an
    // explicit choice, so browser detection remains authoritative in that case.
    if (user?.locale && user.locale !== "en-GB") {
      const storedLocale = resolveLocale(user.locale);
      if (storedLocale) return storedLocale;
    }
  }

  const requestHeaders = await headers();
  return (
    resolvePreferredLocale(requestHeaders.get("accept-language")) ??
    DEFAULT_LOCALE
  );
});

export async function getServerI18n() {
  const locale = await getServerLocale();
  return {
    locale,
    t: (message: string, values?: TranslationValues) =>
      translate(locale, message, values),
  };
}
