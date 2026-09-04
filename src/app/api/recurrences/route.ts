import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { recurrenceSchema } from "@/lib/validators";
import { parseDateOnly } from "@/lib/dates";
import { generateDueTransactions } from "@/lib/recurrence-service";
import { getSelectedAccount } from "@/lib/selected-account";
import { getStoredConversion } from "@/lib/rates";
import { readApiJsonBody } from "@/lib/request-body";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const rules = await db.recurrenceRule.findMany({
    where: { userId, accountId: account.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    items: rules.map((r) => ({
      id: r.id,
      type: r.type,
      amount: Number(r.amount),
      currency: r.currency,
      description: r.description,
      notes: r.notes,
      frequency: r.frequency,
      interval: r.interval,
      daysOfWeek: r.daysOfWeek,
      dayOfMonth: r.dayOfMonth,
      monthOfYear: r.monthOfYear,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
      active: r.active,
      lastGeneratedDate: r.lastGeneratedDate
        ? r.lastGeneratedDate.toISOString().slice(0, 10)
        : null,
      category: r.category
        ? { id: r.category.id, name: r.category.name, color: r.category.color, icon: r.category.icon }
        : null,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = recurrenceSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const data = parsed.data;

  if (data.endDate && data.endDate < data.startDate) {
    return jsonError("The end date must be after the start date", 422);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  if (!user) return jsonError("User not found", 404);
  try {
    await getStoredConversion(data.amount, data.currency, user.baseCurrency);
  } catch {
    return jsonError("The amount cannot be converted to the primary currency", 422);
  }

  let categoryId: string | null = null;
  let type: "EXPENSE" | "INCOME" = data.type;
  if (data.categoryId) {
    const cat = await db.category.findFirst({
      where: { id: data.categoryId, userId },
    });
    if (!cat) return jsonError("Category not found", 404);
    categoryId = cat.id;
    type = cat.type;
  }

  const created = await db.recurrenceRule.create({
    data: {
      userId,
      accountId: account.id,
      categoryId,
      type,
      amount: data.amount,
      currency: data.currency,
      description: data.description || null,
      notes: data.notes || null,
      frequency: data.frequency,
      interval: data.interval,
      daysOfWeek: data.daysOfWeek || null,
      dayOfMonth: data.dayOfMonth ?? null,
      monthOfYear: data.monthOfYear ?? null,
      startDate: parseDateOnly(data.startDate),
      endDate: data.endDate ? parseDateOnly(data.endDate) : null,
      active: data.active,
    },
  });

  // Generate due occurrences immediately when the rule starts in the past.
  try {
    await generateDueTransactions(userId, { force: true });
  } catch {
    /* The layout will retry. */
  }

  return Response.json({ ok: true, item: { ...created, amount: Number(created.amount) } }, { status: 201 });
}
