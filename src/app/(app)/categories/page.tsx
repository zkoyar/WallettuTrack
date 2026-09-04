import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { CategoriesClient } from "@/components/categories/categories-client";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t("Categories")} · WallettuTrack` };
}


export default async function CategoriesPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const categories = await db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <CategoriesClient
      initialCategories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        type: c.type as "EXPENSE" | "INCOME",
      }))}
    />
  );
}
