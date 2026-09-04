import type { Metadata } from "next";
import { getPrivacyConfiguration } from "@/lib/runtime-config";
import { getServerI18n } from "@/lib/i18n-server";
import { getIntlLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Privacy")} · WallettuTrack` };
}
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const { locale, t } = await getServerI18n();
  const updatedDate = new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 7, 31)));
  const privacy = getPrivacyConfiguration();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-5 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("Privacy notice")}</h1>
        <p className="text-sm text-muted-foreground">{t("Last updated: {date}", { date: updatedDate })}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t("Controller and contact details")}</h2>
        <p>
          {t("The controller for this installation is {name}.", {
            name: privacy.controllerName,
          })}{" "}
          {t("For personal-data requests, contact")}{" "}
          <a className="underline underline-offset-4" href={`mailto:${privacy.contactEmail}`}>
            {privacy.contactEmail}
          </a>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t("Data and purposes")}</h2>
        <p>
          {t("WallettuTrack processes your email address, name, bcrypt-hashed password, and financial data to provide authentication, account and transaction management, budgets, forecasts, imports, and backups.")}
        </p>
        <p>
          {t("Cookies are used only where technically necessary for sessions, CSRF protection, preferences, and account selection. The application includes no advertising cookies or profiling tools.")}
        </p>
        <p>
          {t("To prevent abuse, the app temporarily stores hashed fingerprints of the network address and email used for sign-in or registration. These counters expire automatically within one hour.")}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t("Retention and recipients")}</h2>
        <p>
          {t("Data remains in this installation's database until the account is deleted. Operational backups are retained for up to {days} days, unless the operator is subject to different obligations.", {
            days: privacy.retentionDays,
          })}
        </p>
        <p>
          {t("Data is not sold. It may be processed by technical providers selected by the controller for hosting, networking, and backups. The exchange-rate service is queried by the server without sending the user's transactions.")}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t("Rights and control of your data")}</h2>
        <p>
          {t("Settings let you export a complete backup and permanently delete your account. For access, correction, restriction, objection, or other requests, contact the controller at the address above.")}
        </p>
      </section>

      {privacy.visibility === "private" && (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          {t("This installation is configured as private. Before making it public, set the controller's real details in the environment variables.")}
        </p>
      )}
    </main>
  );
}
