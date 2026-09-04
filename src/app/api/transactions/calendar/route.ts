import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import { serializeTransaction } from "@/lib/serializers";
import { getSelectedAccount } from "@/lib/selected-account";

const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
});

/** Returns all transactions for the requested month without pagination. */
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const selectedAccount = await getSelectedAccount(userId);
  if (!selectedAccount) return jsonError("No account available", 409);

  const url = new URL(req.url);
  const parsed = calendarQuerySchema.safeParse({
    year: url.searchParams.get("year"),
    month: url.searchParams.get("month"),
  });
  if (!parsed.success) {
    return jsonError("Invalid year or month", 422);
  }

  const { year, month } = parsed.data;
  const from = new Date(Date.UTC(year, month - 1, 1));
  const toExclusive = new Date(Date.UTC(year, month, 1));

  const items = await db.transaction.findMany({
    where: {
      userId,
      accountId: selectedAccount.id,
      date: { gte: from, lt: toExclusive },
    },
    include: {
      category: true,
      account: true,
      tagLinks: { include: { tag: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });

  return Response.json({
    items: items.map(serializeTransaction),
    total: items.length,
  });
}
