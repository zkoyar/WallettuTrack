import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { getSelectedAccount } from "@/lib/selected-account";

/** Scenario baseline: average monthly expense by category over the last 90
 * days, based on real transactions. */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [grouped, categories] = await Promise.all([
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        accountId: account.id,
        type: "EXPENSE",
        date: { gte: since },
      },
      _sum: { amountBase: true },
    }),
    db.category.findMany({ where: { userId, type: "EXPENSE" } }),
  ]);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const rows = grouped
    .filter((g) => g.categoryId)
    .map((g) => {
      const c = catById.get(g.categoryId!)!;
      const total = Number(g._sum.amountBase ?? 0);
      return c
        ? {
            categoryId: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            avgMonthly: Math.round((total / 3) * 100) / 100,
          }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.avgMonthly - a.avgMonthly);

  const baselineTotal =
    Math.round(rows.reduce((s, r) => s + r.avgMonthly, 0) * 100) / 100;

  return Response.json({ categories: rows, baselineTotal, windowDays: 90 });
}
