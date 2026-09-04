import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { settingsSchema } from "@/lib/validators";
import {
  ConsolidatedBalanceRangeError,
  getAccountsBalance,
  isBaseCurrencyLocked,
  syncUserBalance,
} from "@/lib/account-balance";
import { normalizeMoneyAmount } from "@/lib/financial-constraints";
import { readApiJsonBody } from "@/lib/request-body";

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = settingsSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  if (!currentUser) return jsonError("User not found", 404);

  if (
    parsed.data.baseCurrency &&
    parsed.data.baseCurrency !== currentUser.baseCurrency &&
    (await isBaseCurrencyLocked(userId))
  ) {
    return jsonError(
      "The primary currency cannot be changed after adding balances or movements",
      409
    );
  }

  // currentBalance remains accepted for legacy clients, but is applied to the
  // first account. Accounts remain the authoritative source.
  const { currentBalance, ...profile } = parsed.data;
  const updated = await db.$transaction(async (tx) => {
    if (currentBalance !== undefined) {
      const accounts = await tx.account.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, currentBalance: true },
      });
      if (accounts.length === 0) {
        await tx.account.create({
          data: {
            userId,
            name: "Main account",
            icon: "🏦",
            currentBalance,
          },
        });
      } else {
        const otherBalance = accounts
          .slice(1)
          .reduce(
            (total, account) => total + Number(account.currentBalance),
            0
          );
        const primaryBalance = normalizeMoneyAmount(
          currentBalance - otherBalance
        );
        if (primaryBalance === null) return null;
        await tx.account.update({
          where: { id: accounts[0].id },
          data: { currentBalance: primaryBalance },
        });
      }
    }

    await tx.user.update({ where: { id: userId }, data: profile });
    await syncUserBalance(userId, tx);
    return tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        baseCurrency: true,
        currentBalance: true,
      },
    });
  }).catch((error: unknown) => {
    if (error instanceof ConsolidatedBalanceRangeError) return null;
    throw error;
  });

  if (!updated) {
    return jsonError(
      "The requested total would exceed an account's supported balance range",
      422
    );
  }

  const consolidatedBalance = await getAccountsBalance(userId);

  return Response.json({
    ok: true,
    user: { ...updated, currentBalance: consolidatedBalance },
  });
}
