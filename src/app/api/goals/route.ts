import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { z } from "zod";
import { serializeGoal } from "@/lib/serializers";
import { getSelectedAccount } from "@/lib/selected-account";
import {
  currencyCodeSchema,
  moneyAmountSchema,
  nonNegativeMoneyAmountSchema,
  positiveMoneyAmountSchema,
} from "@/lib/validators";
import {
  MAX_MONEY_AMOUNT,
  normalizeMoneyAmount,
} from "@/lib/financial-constraints";
import { readApiJsonBody } from "@/lib/request-body";

const goalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  icon: z.string().trim().min(1).max(8).default("🎯"),
  targetAmount: positiveMoneyAmountSchema,
  savedAmount: nonNegativeMoneyAmountSchema.default(0),
  currency: currencyCodeSchema.default("EUR"),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .nullish(),
});

const goalUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().min(1).max(8).optional(),
  targetAmount: positiveMoneyAmountSchema.optional(),
  savedAmount: nonNegativeMoneyAmountSchema.optional(),
  addToSaved: moneyAmountSchema.optional(),
  currency: currencyCodeSchema.optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .nullish(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const goals = await db.goal.findMany({
    where: { userId, accountId: account.id },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  return Response.json({
    items: goals.map(serializeGoal),
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = goalSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const d = parsed.data;

  const created = await db.goal.create({
    data: {
      userId,
      accountId: account.id,
      name: d.name,
      icon: d.icon,
      targetAmount: d.targetAmount,
      savedAmount: d.savedAmount,
      currency: d.currency,
      deadline: d.deadline ? parseIso(d.deadline) : null,
    },
  });

  return Response.json({ ok: true, item: serializeGoal(created) }, { status: 201 });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = goalUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const { id, addToSaved, ...fields } = parsed.data;

  const existing = await db.goal.findFirst({
    where: { id, userId, accountId: account.id },
  });
  if (!existing) return jsonError("Goal not found", 404);

  let saved = Number(existing.savedAmount);
  if (fields.savedAmount !== undefined) {
    saved = fields.savedAmount;
  } else if (addToSaved !== undefined) {
    saved = Math.max(0, saved + addToSaved);
  }
  const normalizedSaved = normalizeMoneyAmount(saved);
  if (
    normalizedSaved === null ||
    normalizedSaved < 0 ||
    normalizedSaved > MAX_MONEY_AMOUNT
  ) {
    return jsonError("Invalid saved amount", 422);
  }
  saved = normalizedSaved;

  const updated = await db.goal.update({
    where: { id },
    data: {
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.icon !== undefined ? { icon: fields.icon } : {}),
      ...(fields.targetAmount !== undefined ? { targetAmount: fields.targetAmount } : {}),
      savedAmount: saved,
      ...(fields.currency !== undefined ? { currency: fields.currency } : {}),
      ...(fields.deadline !== undefined
        ? { deadline: fields.deadline ? parseIso(fields.deadline) : null }
        : {}),
    },
  });

  return Response.json({ ok: true, item: serializeGoal(updated) });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const existing = await db.goal.findFirst({
    where: { id, userId, accountId: account.id },
  });
  if (!existing) return jsonError("Goal not found", 404);

  await db.goal.delete({ where: { id } });
  return Response.json({ ok: true });
}

function parseIso(s: string): Date {
  return new Date(s + "T00:00:00Z");
}
