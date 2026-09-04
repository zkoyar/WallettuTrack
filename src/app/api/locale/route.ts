import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api-helpers";
import {
  getIntlLocale,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
} from "@/lib/i18n";
import { readJsonBody } from "@/lib/request-body";

const MAX_LOCALE_BODY_BYTES = 2 * 1024;

const localeSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
});

export async function POST(request: Request) {
  const body = await readJsonBody(request, MAX_LOCALE_BODY_BYTES);
  if (!body.ok && body.reason === "too_large") {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }
  const parsed = localeSchema.safeParse(body.ok ? body.value : null);
  if (!parsed.success) {
    return Response.json({ error: "Invalid language" }, { status: 422 });
  }

  const { locale } = parsed.data;
  (await cookies()).set({
    name: LOCALE_COOKIE,
    value: locale,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const userId = await requireUserId();
  if (userId) {
    await db.user.updateMany({
      where: { id: userId },
      data: { locale: getIntlLocale(locale) },
    });
  }

  return Response.json({ ok: true, locale });
}
