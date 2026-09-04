import { requireUser } from "@/lib/session";
import { CalendarClient } from "@/components/calendar/calendar-client";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Calendar")} · WallettuTrack` };
}


export default async function CalendarPage() {
  const user = await requireUser();
  return <CalendarClient baseCurrency={user.baseCurrency} />;
}
