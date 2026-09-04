import { db } from "@/lib/db";
import { serializeAccount } from "@/lib/serializers";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { z } from "zod";
import {
  ConsolidatedBalanceRangeError,
  syncUserBalance,
} from "@/lib/account-balance";
import { getSelectedAccount } from "@/lib/selected-account";
import { accountSchema, accountUpdateSchema } from "@/lib/validators";
import type { Account } from "@/generated/prisma/client";
import { readApiJsonBody } from "@/lib/request-body";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const accounts = await db.account.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const items = accounts.map(serializeAccount);
  const selected = await getSelectedAccount(userId, items);

  return Response.json({
    items,
    selectedAccountId: selected?.id ?? null,
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = accountSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const dup = await db.account.findFirst({
    where: { userId, name: parsed.data.name },
  });
  if (dup) return jsonError("An account with this name already exists", 409);

  const count = await db.account.count({ where: { userId } });

  let created: Account;
  try {
    created = await db.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: { ...parsed.data, userId, sortOrder: count },
      });
      await syncUserBalance(userId, tx);
      return account;
    });
  } catch (error) {
    if (error instanceof ConsolidatedBalanceRangeError) {
      return jsonError(error.message, 422);
    }
    throw error;
  }

  return Response.json(
    { ok: true, item: serializeAccount(created) },
    { status: 201 }
  );
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = accountUpdateSchema
    .extend({ id: z.string().cuid() })
    .safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const { id, ...fields } = parsed.data;

  const existing = await db.account.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Account not found", 404);

  if (fields.name && fields.name !== existing.name) {
    const dup = await db.account.findFirst({ where: { userId, name: fields.name } });
    if (dup) return jsonError("An account with this name already exists", 409);
  }

  let updated: Account;
  try {
    updated = await db.$transaction(async (tx) => {
      const account = await tx.account.update({ where: { id }, data: fields });
      await syncUserBalance(userId, tx);
      return account;
    });
  } catch (error) {
    if (error instanceof ConsolidatedBalanceRangeError) {
      return jsonError(error.message, 422);
    }
    throw error;
  }

  return Response.json({
    ok: true,
    item: serializeAccount(updated),
  });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const existing = await db.account.findFirst({ where: { id, userId } });
  if (!existing) return jsonError("Account not found", 404);

  const accountCount = await db.account.count({ where: { userId } });
  if (accountCount <= 1) {
    return jsonError("At least one account must remain", 409);
  }

  // Prevent deletion from detaching movements and plans from their account.
  const linkedCounts = await Promise.all([
    db.transaction.count({ where: { userId, accountId: id } }),
    db.recurrenceRule.count({ where: { userId, accountId: id } }),
    db.plannedEvent.count({ where: { userId, accountId: id } }),
    db.budget.count({ where: { userId, accountId: id } }),
    db.goal.count({ where: { userId, accountId: id } }),
  ]);
  if (linkedCounts.some((count) => count > 0)) {
    return jsonError(
      "This account contains data; move or delete it before removing the account",
      409
    );
  }

  await db.$transaction(async (tx) => {
    await tx.account.delete({ where: { id } });
    await syncUserBalance(userId, tx);
  });
  return Response.json({ ok: true });
}
