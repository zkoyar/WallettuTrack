import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { categoryUpdateSchema } from "@/lib/validators";
import { readApiJsonBody } from "@/lib/request-body";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = categoryUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const existing = await db.category.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Category not found", 404);

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const dup = await db.category.findFirst({
      where: { userId, name: parsed.data.name },
    });
    if (dup) return jsonError("A category with this name already exists", 409);
  }

  const updated = await db.category.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json({ ok: true, item: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const existing = await db.category.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Category not found", 404);

  // Linked transactions are detached by setting categoryId to NULL.
  await db.category.delete({ where: { id } });
  return Response.json({ ok: true });
}
