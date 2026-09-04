import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { parseDateOnly } from "@/lib/dates";
import { serializeEvent } from "@/lib/serializers";
import { generateDueTransactions } from "@/lib/recurrence-service";
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

const eventSchema = z.object({
  type: categoryTypeSchema.default("EXPENSE"),
  categoryId: z.string().cuid().nullable().optional(),
  amount: positiveMoneyAmountSchema,
  currency: currencyCodeSchema,
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional().or(z.literal("")),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  // Include past events that have not yet been materialized as of today.
  const events = await db.plannedEvent.findMany({
    where: { userId, accountId: account.id },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  return Response.json({ items: events.map(serializeEvent) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = eventSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const data = parsed.data;

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

  const created = await db.plannedEvent.create({
    data: {
      userId,
      accountId: account.id,
      categoryId,
      type,
      amount: data.amount,
      currency: data.currency,
      description: data.description || null,
      notes: data.notes || null,
      date: parseDateOnly(data.date),
    },
  });

  // Materialize an already-due event immediately with a forced run.
  try {
    await generateDueTransactions(userId, { force: true });
  } catch {
    /* The layout will retry. */
  }

  return Response.json(
    { ok: true, item: serializeEvent(created) },
    { status: 201 }
  );
}
