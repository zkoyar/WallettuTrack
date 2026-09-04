import { requireUser } from "@/lib/session";
import { ForecastsClient } from "@/components/forecasts/forecasts-client";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Forecasts")} · WallettuTrack` };
}


export default async function ForecastsPage() {
  await requireUser(); // Explicit protection in addition to the layout.
  return <ForecastsClient />;
}
