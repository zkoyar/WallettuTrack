import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { transactionUpdateSchema } from "@/lib/validators";
import { getStoredConversion } from "@/lib/rates";
import { parseDateOnly } from "@/lib/dates";
import { serializeTransaction } from "@/lib/serializers";
import { readApiJsonBody } from "@/lib/request-body";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = transactionUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const data = parsed.data;
  const tagIds = data.tagIds === undefined ? undefined : [...new Set(data.tagIds)];

  const existing = await db.transaction.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Transaction not found", 404);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  if (!user) return jsonError("User not found", 404);

  let categoryId = existing.categoryId;
  let type = data.type ?? existing.type;
  if (data.categoryId !== undefined) {
    if (data.categoryId === null || data.categoryId === "") {
      categoryId = null;
    } else {
      const cat = await db.category.findFirst({
        where: { id: data.categoryId, userId },
      });
      if (!cat) return jsonError("Category not found", 404);
      categoryId = cat.id;
      type = cat.type;
    }
  }

  let accountId = existing.accountId;
  if ("accountId" in data) {
    const raw = (data as { accountId?: string | null }).accountId;
    if (!raw) {
      accountId = null;
    } else {
      const acc = await db.account.findFirst({ where: { id: raw, userId } });
      if (!acc) return jsonError("Account not found", 404);
      accountId = acc.id;
    }
  }
  if (tagIds && tagIds.length > 0) {
    const ownedTags = await db.tag.count({
      where: { userId, id: { in: tagIds } },
    });
    if (ownedTags !== tagIds.length) return jsonError("Tag not found", 404);
  }

  const amount = data.amount ?? Number(existing.amount);
  const currency = data.currency ?? existing.currency;

  let amountBase = Number(existing.amountBase);
  let exchangeRate =
    existing.exchangeRate === null ? null : Number(existing.exchangeRate);
  if (data.amount !== undefined || data.currency !== undefined) {
    try {
      const conversion = await getStoredConversion(
        amount,
        currency,
        user.baseCurrency
      );
      amountBase = conversion.amountBase;
      exchangeRate = conversion.exchangeRate;
    } catch {
      return jsonError(
        "The amount cannot be converted to the primary currency",
        422
      );
    }
  }

  const updated = await db.transaction.update({
    where: { id },
    data: {
      type,
      categoryId,
      accountId,
      amount,
      currency,
      amountBase,
      exchangeRate,
      ...(data.date ? { date: parseDateOnly(data.date) } : {}),
      ...(data.description !== undefined
        ? { description: data.description || null }
        : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(tagIds !== undefined
        ? {
            tagLinks: {
              deleteMany: {},
              create: tagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            },
          }
        : {}),
    },
    include: {
      category: true,
      account: true,
      tagLinks: { include: { tag: true } },
    },
  });

  return Response.json({
    ok: true,
    item: serializeTransaction(updated),
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const existing = await db.transaction.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Transaction not found", 404);

  // For transfers, delete the paired transaction as well.
  if (existing.transferGroupId) {
    await db.transaction.deleteMany({
      where: { userId, transferGroupId: existing.transferGroupId },
    });
    return Response.json({ ok: true });
  }

  await db.transaction.delete({ where: { id } });
  return Response.json({ ok: true });
}
