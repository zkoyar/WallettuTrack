import Link from "next/link";
import { getServerI18n } from "@/lib/i18n-server";

export default async function NotFound() {
  const { t } = await getServerI18n();
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold">{t("Page not found")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("The page you are looking for does not exist or has been moved.")}
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("Back to dashboard")}
      </Link>
    </main>
  );
}
