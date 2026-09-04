import { requireUser } from "@/lib/session";
import { TransactionsClient } from "@/components/transactions/transactions-client";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Transactions")} · WallettuTrack` };
}


export default async function TransactionsPage() {
  const user = await requireUser();
  return <TransactionsClient baseCurrency={user.baseCurrency} />;
}
