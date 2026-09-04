import { z } from "zod";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import {
  ConsolidatedBalanceRangeError,
  syncUserBalance,
} from "@/lib/account-balance";
import { db } from "@/lib/db";
import { getSelectedAccount } from "@/lib/selected-account";
import {
  calculateReconciliationDifference,
  MAX_NOTES_LENGTH,
} from "@/lib/financial-constraints";
import { moneyAmountSchema } from "@/lib/validators";
import { readApiJsonBody } from "@/lib/request-body";
import type { AccountReconciliation } from "@/generated/prisma/client";

const reconciliationSchema = z.object({
  actualBalance: moneyAmountSchema,
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional().or(z.literal("")),
});

function serializeReconciliation(item: {
  id: string;
  balanceBefore: unknown;
  actualBalance: unknown;
  difference: unknown;
  notes: string | null;
  reconciledAt: Date;
}) {
  return {
    id: item.id,
    balanceBefore: Number(item.balanceBefore),
    actualBalance: Number(item.actualBalance),
    difference: Number(item.difference),
    notes: item.notes,
    reconciledAt: item.reconciledAt.toISOString(),
  };
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const history = await db.accountReconciliation.findMany({
    where: { userId, accountId: account.id },
    orderBy: { reconciledAt: "desc" },
    take: 24,
  });

  return Response.json({
    account: {
      id: account.id,
      name: account.name,
      icon: account.icon,
      currentBalance: account.currentBalance,
    },
    items: history.map(serializeReconciliation),
  });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const selected = await getSelectedAccount(userId);
  if (!selected) return jsonError("No account available", 409);

  const body = await readApiJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = reconciliationSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  let item: AccountReconciliation;
  try {
    item = await db.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: selected.id, userId },
      });
      if (!account) throw new Error("ACCOUNT_NOT_FOUND");

      const balanceBefore = Number(account.currentBalance);
      const actualBalance = parsed.data.actualBalance;
      const difference = calculateReconciliationDifference(
        actualBalance,
        balanceBefore
      );
      if (difference === null) throw new Error("RECONCILIATION_OUT_OF_RANGE");
      const reconciliation = await tx.accountReconciliation.create({
        data: {
          userId,
          accountId: account.id,
          balanceBefore,
          actualBalance,
          difference,
          notes: parsed.data.notes || null,
        },
      });
      await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: actualBalance },
      });
      await syncUserBalance(userId, tx);
      return reconciliation;
    });
  } catch (error) {
    if (error instanceof ConsolidatedBalanceRangeError) {
      return jsonError(error.message, 422);
    }
    throw error;
  }

  return Response.json(
    { ok: true, item: serializeReconciliation(item) },
    { status: 201 }
  );
}
