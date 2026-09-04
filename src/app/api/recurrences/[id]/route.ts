import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { recurrenceUpdateSchema } from "@/lib/validators";
import {
  addDaysIso,
  parseDateOnly,
  toDateString,
  todayString,
} from "@/lib/dates";
import { generateDueTransactions } from "@/lib/recurrence-service";
import {
  recurrenceMaterializationChanged,
  type RecurrenceMaterializationShape,
} from "@/lib/recurrence";
import { getSelectedAccount } from "@/lib/selected-account";
import { getStoredConversion } from "@/lib/rates";
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

  const parsed = recurrenceUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const data = parsed.data;

  const existing = await db.recurrenceRule.findFirst({
    where: { id, userId, accountId: account.id },
  });
  if (!existing) return jsonError("Rule not found", 404);

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

  const startDate = data.startDate ?? toDateString(existing.startDate);
  const endDate =
    data.endDate !== undefined
      ? data.endDate || null
      : existing.endDate
        ? toDateString(existing.endDate)
        : null;
  if (endDate && endDate < startDate) {
    return jsonError("The end date must be after the start date", 422);
  }

  const before: RecurrenceMaterializationShape = {
    type: existing.type,
    categoryId: existing.categoryId,
    amount: Number(existing.amount),
    currency: existing.currency,
    description: existing.description,
    notes: existing.notes,
    frequency: existing.frequency,
    interval: existing.interval,
    daysOfWeek: existing.daysOfWeek,
    dayOfMonth: existing.dayOfMonth,
    monthOfYear: existing.monthOfYear,
    startDate: toDateString(existing.startDate),
    endDate: existing.endDate ? toDateString(existing.endDate) : null,
  };
  const after: RecurrenceMaterializationShape = {
    type,
    categoryId,
    amount: data.amount ?? Number(existing.amount),
    currency: data.currency ?? existing.currency,
    description:
      data.description !== undefined
        ? data.description || null
        : existing.description,
    notes: data.notes !== undefined ? data.notes || null : existing.notes,
    frequency: data.frequency ?? existing.frequency,
    interval: data.interval ?? existing.interval,
    daysOfWeek:
      data.daysOfWeek !== undefined
        ? data.daysOfWeek || null
        : existing.daysOfWeek,
    dayOfMonth:
      data.dayOfMonth !== undefined
        ? data.dayOfMonth ?? null
        : existing.dayOfMonth,
    monthOfYear:
      data.monthOfYear !== undefined
        ? data.monthOfYear ?? null
        : existing.monthOfYear,
    startDate,
    endDate,
  };

  // Any change that affects future installments restarts from today without
  // rewriting history. The previous day is calculated from ISO strings.
  // It is then converted to midnight UTC without local-time arithmetic.
  const structuralChanged = recurrenceMaterializationChanged(before, after);
  const resetGeneratedDate = parseDateOnly(addDaysIso(todayString(), -1));

  if ((data.active ?? existing.active) && (structuralChanged || data.active === true)) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true },
    });
    if (!user) return jsonError("User not found", 404);
    try {
      await getStoredConversion(after.amount, after.currency, user.baseCurrency);
    } catch {
      return jsonError(
        "The amount cannot be converted to the primary currency",
        422
      );
    }
  }

  const updated = await db.recurrenceRule.update({
    where: { id },
    data: {
      type: after.type,
      categoryId: after.categoryId,
      amount: after.amount,
      currency: after.currency,
      description: after.description,
      notes: after.notes,
      frequency: after.frequency,
      interval: after.interval,
      daysOfWeek: after.daysOfWeek,
      dayOfMonth: after.dayOfMonth,
      monthOfYear: after.monthOfYear,
      startDate: parseDateOnly(after.startDate),
      endDate: after.endDate ? parseDateOnly(after.endDate) : null,
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(structuralChanged
        ? { lastGeneratedDate: resetGeneratedDate }
        : {}),
    },
  });

  if (structuralChanged || data.active) {
    try {
      await generateDueTransactions(userId, { force: true });
    } catch {
      /* The layout will retry. */
    }
  }

  return Response.json({ ok: true, item: { ...updated, amount: Number(updated.amount) } });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const { id } = await ctx.params;
  const existing = await db.recurrenceRule.findFirst({
    where: { id, userId, accountId: account.id },
  });
  if (!existing) return jsonError("Rule not found", 404);

  // Previously generated transactions remain with recurrenceRuleId set to NULL.
  await db.recurrenceRule.delete({ where: { id } });
  return Response.json({ ok: true });
}
