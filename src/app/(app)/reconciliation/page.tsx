import { ReconciliationClient } from "@/components/reconciliation/reconciliation-client";
import { requireUser } from "@/lib/session";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Account reconciliation")} · WallettuTrack` };
}

export default async function ReconciliationPage() {
  const user = await requireUser();
  return <ReconciliationClient baseCurrency={user.baseCurrency} />;
}
