import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const existing = await db.categoryRule.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Rule not found", 404);

  await db.categoryRule.delete({ where: { id } });
  return Response.json({ ok: true });
}
