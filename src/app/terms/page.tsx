import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";
import { getIntlLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Terms of use")} · WallettuTrack` };
}

export default async function TermsPage() {
  const { locale, t } = await getServerI18n();
  const updatedDate = new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 7, 31)));
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-5 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("Terms of use")}</h1>
        <p className="text-sm text-muted-foreground">{t("Last updated: {date}", { date: updatedDate })}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t("Use of the service")}</h2>
        <p>
          {t("WallettuTrack is a personal organization tool. It does not provide financial, tax, legal, or accounting advice and does not replace statements issued by financial institutions.")}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t("User responsibilities")}</h2>
        <p>
          {t("You are responsible for the accuracy of entered data, safeguarding your credentials, and regularly checking your backups. Abuse, unauthorized access attempts, and unlawful use are prohibited.")}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t("Availability and license")}</h2>
        <p>
          {t("The service may be suspended for maintenance or security. The software is distributed under the GNU Affero General Public License 3.0; corresponding source code must be made available where required by the license.")}
        </p>
      </section>
    </main>
  );
}
