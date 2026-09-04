import { requireUser } from "@/lib/session";
import { RecurrencesClient } from "@/components/transactions/recurrences-client";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Recurring items")} · WallettuTrack` };
}


export default async function RecurrencesPage() {
  const user = await requireUser();
  return <RecurrencesClient baseCurrency={user.baseCurrency} />;
}
