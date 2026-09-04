import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/settings-client";
import { isBaseCurrencyLocked } from "@/lib/account-balance";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Settings")} · WallettuTrack` };
}


export default async function SettingsPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");
  const [user, baseCurrencyLocked] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, baseCurrency: true },
    }),
    isBaseCurrencyLocked(userId),
  ]);

  return (
    <SettingsClient
      user={{
        name: user.name,
        email: user.email,
        baseCurrency: user.baseCurrency,
        baseCurrencyLocked,
      }}
    />
  );
}
