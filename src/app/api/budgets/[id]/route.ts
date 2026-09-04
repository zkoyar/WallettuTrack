import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { budgetUpdateSchema } from "@/lib/validators";
import { getSelectedAccount } from "@/lib/selected-account";
import { readApiJsonBody } from "@/lib/request-body";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const { id } = await ctx.params;
  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = budgetUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const existing = await db.budget.findFirst({
    where: { id, userId, accountId: account.id },
  });
  if (!existing) return jsonError("Budget not found", 404);

  if (parsed.data.categoryId) {
    const cat = await db.category.findFirst({
      where: { id: parsed.data.categoryId, userId },
    });
    if (!cat) return jsonError("Category not found", 404);
  }

  const updated = await db.budget.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  });

  return Response.json({ ok: true, item: { ...updated, amount: Number(updated.amount) } });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const { id } = await ctx.params;
  const existing = await db.budget.findFirst({
    where: { id, userId, accountId: account.id },
  });
  if (!existing) return jsonError("Budget not found", 404);

  await db.budget.delete({ where: { id } });
  return Response.json({ ok: true });
}
