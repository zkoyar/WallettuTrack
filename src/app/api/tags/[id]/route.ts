import { z } from "zod";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { readApiJsonBody } from "@/lib/request-body";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color").optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;

  const body = await readApiJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = updateSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const existing = await db.tag.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Tag not found", 404);

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const duplicate = await db.tag.findFirst({
      where: { userId, name: parsed.data.name, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) return jsonError("Tag already exists", 409);
  }

  const item = await db.tag.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, color: true },
  });
  return Response.json({ ok: true, item });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.tag.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Tag not found", 404);
  await db.tag.delete({ where: { id } });
  return Response.json({ ok: true });
}
