import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { readApiJsonBody } from "@/lib/request-body";
import { syncUserBalance } from "@/lib/account-balance";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { SELECTED_ACCOUNT_COOKIE } from "@/lib/selected-account";
import { currencyCodeSchema, moneyAmountSchema } from "@/lib/validators";

const onboardingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  baseCurrency: currencyCodeSchema,
  accountId: z.string().cuid(),
  accountName: z.string().trim().min(1, "Account name is required").max(40),
  currentBalance: moneyAmountSchema,
  categoryIds: z
    .array(z.string().cuid())
    .min(2, "Choose at least one expense category and one income category")
    .max(100)
    .transform((ids) => [...new Set(ids)]),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = onboardingSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { baseCurrency: true, onboardingCompletedAt: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.onboardingCompletedAt) throw new Error("ONBOARDING_COMPLETED");

      const [account, categories] = await Promise.all([
        tx.account.findFirst({
          where: { id: parsed.data.accountId, userId },
          select: { id: true, name: true },
        }),
        tx.category.findMany({
          where: { userId, id: { in: parsed.data.categoryIds } },
          select: { id: true, type: true },
        }),
      ]);
      if (!account) throw new Error("ACCOUNT_NOT_FOUND");
      if (categories.length !== parsed.data.categoryIds.length) {
        throw new Error("CATEGORY_NOT_FOUND");
      }
      if (!categories.some((category) => category.type === "EXPENSE")) {
        throw new Error("EXPENSE_CATEGORY_REQUIRED");
      }
      if (!categories.some((category) => category.type === "INCOME")) {
        throw new Error("INCOME_CATEGORY_REQUIRED");
      }

      if (
        parsed.data.baseCurrency !== user.baseCurrency &&
        (await hasExistingFinancialData(tx, userId))
      ) {
        throw new Error("CURRENCY_LOCKED");
      }

      if (parsed.data.accountName !== account.name) {
        const duplicate = await tx.account.findFirst({
          where: { userId, name: parsed.data.accountName, id: { not: account.id } },
          select: { id: true },
        });
        if (duplicate) throw new Error("ACCOUNT_NAME_DUPLICATE");
      }

      await tx.account.update({
        where: { id: account.id },
        data: {
          name: parsed.data.accountName,
          currentBalance: parsed.data.currentBalance,
        },
      });

      await tx.category.deleteMany({
        where: {
          userId,
          id: { notIn: parsed.data.categoryIds },
          transactions: { none: {} },
          budgets: { none: {} },
          recurrenceRules: { none: {} },
          plannedEvents: { none: {} },
          categoryRules: { none: {} },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          name: parsed.data.name,
          baseCurrency: parsed.data.baseCurrency,
          onboardingCompletedAt: new Date(),
        },
      });
      await syncUserBalance(userId, tx);
    });
  } catch (error) {
    if (error instanceof Error) {
      const knownErrors: Record<string, [string, number]> = {
        USER_NOT_FOUND: ["User not found", 404],
        ONBOARDING_COMPLETED: ["Initial setup has already been completed", 409],
        ACCOUNT_NOT_FOUND: ["Account not found", 404],
        CATEGORY_NOT_FOUND: ["A category is no longer available", 404],
        EXPENSE_CATEGORY_REQUIRED: ["Choose at least one expense category", 422],
        INCOME_CATEGORY_REQUIRED: ["Choose at least one income category", 422],
        CURRENCY_LOCKED: [
          "The currency cannot be changed because financial data already exists",
          409,
        ],
        ACCOUNT_NAME_DUPLICATE: ["An account with this name already exists", 409],
      };
      const known = knownErrors[error.message];
      if (known) return jsonError(known[0], known[1]);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("An account with this name already exists", 409);
    }
    console.error("Initial setup failed", error);
    return jsonError("Initial setup failed", 422);
  }

  (await cookies()).set({
    name: SELECTED_ACCOUNT_COOKIE,
    value: parsed.data.accountId,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return Response.json({ ok: true });
}

async function hasExistingFinancialData(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<boolean> {
  const [transactions, recurrences, events, budgets, goals, balance] =
    await Promise.all([
      tx.transaction.count({ where: { userId } }),
      tx.recurrenceRule.count({ where: { userId } }),
      tx.plannedEvent.count({ where: { userId } }),
      tx.budget.count({ where: { userId } }),
      tx.goal.count({ where: { userId } }),
      tx.account.aggregate({
        where: { userId },
        _sum: { currentBalance: true },
      }),
    ]);
  return (
    transactions > 0 ||
    recurrences > 0 ||
    events > 0 ||
    budgets > 0 ||
    goals > 0 ||
    Number(balance._sum.currentBalance ?? 0) !== 0
  );
}
