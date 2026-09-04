import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api-helpers";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Initial setup")} · WallettuTrack` };
}

export default async function OnboardingPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      baseCurrency: true,
      onboardingCompletedAt: true,
    },
  });
  if (!user) redirect("/login");
  if (user.onboardingCompletedAt) redirect("/dashboard");

  let account = await db.account.findFirst({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (!account) {
    account = await db.account.create({
      data: { userId, name: "Main account", icon: "🏦" },
    });
  }

  const categories = await db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, icon: true, color: true, type: true },
  });

  return (
    <OnboardingWizard
      user={{
        name: user.name ?? "",
        email: user.email,
        baseCurrency: user.baseCurrency,
      }}
      account={{
        id: account.id,
        name: account.name,
        currentBalance: Number(account.currentBalance),
      }}
      categories={categories}
    />
  );
}
