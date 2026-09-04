import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { parseDateOnly } from "@/lib/dates";
import { z } from "zod";
import { getSelectedAccount } from "@/lib/selected-account";
import {
  categoryTypeSchema,
  currencyCodeSchema,
  positiveMoneyAmountSchema,
} from "@/lib/validators";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
} from "@/lib/financial-constraints";
import { getStoredConversion } from "@/lib/rates";
import { readApiJsonBody } from "@/lib/request-body";

type Ctx = { params: Promise<{ id: string }> };

const eventUpdateSchema = z.object({
  type: categoryTypeSchema.optional(),
  categoryId: z.string().cuid().nullable().optional(),
  amount: positiveMoneyAmountSchema.optional(),
  currency: currencyCodeSchema.optional(),
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional().or(z.literal("")),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const { id } = await ctx.params;
  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = eventUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const data = parsed.data;

  const existing = await db.plannedEvent.findFirst({
    where: { id, userId, accountId: account.id },
  });
  if (!existing) return jsonError("Event not found", 404);

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

  if (
    data.amount !== undefined ||
    data.currency !== undefined ||
    data.date !== undefined
  ) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true },
    });
    if (!user) return jsonError("User not found", 404);
    try {
      await getStoredConversion(
        data.amount ?? Number(existing.amount),
        data.currency ?? existing.currency,
        user.baseCurrency
      );
    } catch {
      return jsonError(
        "The amount cannot be converted to the primary currency",
        422
      );
    }
  }

  const updated = await db.plannedEvent.update({
    where: { id },
    data: {
      type,
      categoryId,
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.description !== undefined
        ? { description: data.description || null }
        : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(data.date ? { date: parseDateOnly(data.date) } : {}),
    },
  });

  return Response.json({ ok: true, item: { ...updated, amount: Number(updated.amount) } });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const { id } = await ctx.params;
  const existing = await db.plannedEvent.findFirst({
    where: { id, userId, accountId: account.id },
  });
  if (!existing) return jsonError("Event not found", 404);

  await db.plannedEvent.delete({ where: { id } });
  return Response.json({ ok: true });
}
