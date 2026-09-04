import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { parseDateOnly } from "@/lib/dates";
import { getStoredConversion } from "@/lib/rates";
import { z } from "zod";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/financial-constraints";
import { getSelectedAccount } from "@/lib/selected-account";
import { positiveMoneyAmountSchema } from "@/lib/validators";
import { readApiJsonBody } from "@/lib/request-body";

const transferSchema = z
  .object({
    fromAccountId: z.string().cuid("Source account is required"),
    toAccountId: z.string().cuid("Destination account is required"),
    amount: positiveMoneyAmountSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    description: z
      .string()
      .trim()
      .max(MAX_DESCRIPTION_LENGTH - 2)
      .optional()
      .or(z.literal("")),
  })
  .refine((t) => t.fromAccountId !== t.toAccountId, {
    message: "The two accounts must be different",
    path: ["toAccountId"],
  });

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const selectedAccount = await getSelectedAccount(userId);
  if (!selectedAccount) return jsonError("No account available", 409);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = transferSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const { fromAccountId, toAccountId, amount, date, description } = parsed.data;
  if (
    fromAccountId !== selectedAccount.id &&
    toAccountId !== selectedAccount.id
  ) {
    return jsonError("The transfer must involve the active account", 422);
  }

  const accounts = await db.account.findMany({
    where: { userId, id: { in: [fromAccountId, toAccountId] } },
  });
  if (accounts.length !== 2) return jsonError("Account not found", 404);
  const from = accounts.find((a) => a.id === fromAccountId)!;
  const to = accounts.find((a) => a.id === toAccountId)!;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  if (!user) return jsonError("User not found", 404);

  // Convert to the base currency for consolidated totals.
  let conversion: Awaited<ReturnType<typeof getStoredConversion>>;
  try {
    conversion = await getStoredConversion(
      amount,
      user.baseCurrency,
      user.baseCurrency
    );
  } catch {
    return jsonError("The amount cannot be stored in the primary currency", 422);
  }
  const groupId = crypto.randomUUID();

  const desc = description?.trim() || `Transfer ${from.name} → ${to.name}`;

  const [outTx, inTx] = await db.$transaction([
    db.transaction.create({
      data: {
        userId,
        accountId: from.id,
        type: "EXPENSE",
        amount,
        currency: user.baseCurrency,
        amountBase: conversion.amountBase,
        exchangeRate: conversion.exchangeRate,
        date: parseDateOnly(date),
        description: `${desc} →`,
          notes: "Internal transfer",
        transferGroupId: groupId,
      },
    }),
    db.transaction.create({
      data: {
        userId,
        accountId: to.id,
        type: "INCOME",
        amount,
        currency: user.baseCurrency,
        amountBase: conversion.amountBase,
        exchangeRate: conversion.exchangeRate,
        date: parseDateOnly(date),
        description: `→ ${desc}`,
          notes: "Internal transfer",
        transferGroupId: groupId,
      },
    }),
  ]);

  return Response.json(
    {
      ok: true,
      items: [outTx, inTx].map((t) => ({
        ...t,
        amount: Number(t.amount),
        amountBase: Number(t.amountBase),
      })),
    },
    { status: 201 }
  );
}

/** Lists recent transfers grouped with their two transactions. */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const selectedSides = await db.transaction.findMany({
    where: {
      userId,
      accountId: account.id,
      transferGroupId: { not: null },
    },
    select: { transferGroupId: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    distinct: ["transferGroupId"],
    take: 50,
  });
  const groupIds = selectedSides
    .map((item) => item.transferGroupId)
    .filter((id): id is string => id !== null);

  const txs = await db.transaction.findMany({
    where: { userId, transferGroupId: { in: groupIds } },
    include: { account: true },
    orderBy: [{ date: "desc" }, { createdAt: "asc" }],
    take: 100,
  });

  const groups = new Map<string, typeof txs>();
  for (const t of txs) {
    const arr = groups.get(t.transferGroupId!) ?? [];
    arr.push(t);
    groups.set(t.transferGroupId!, arr);
  }

  const items = [...groups.values()].map((pair) => {
    const out = pair.find((t) => t.type === "EXPENSE")!;
    const inc = pair.find((t) => t.type === "INCOME")!;
    return {
      groupId: out.transferGroupId,
      outTransactionId: out.id,
      inTransactionId: inc.id,
      date: out.date.toISOString().slice(0, 10),
      description: (out.description ?? "").replace(/ →$/, ""),
      amount: Number(out.amount),
      currency: out.currency,
      fromAccount: out.account ? { id: out.account.id, name: out.account.name, icon: out.account.icon } : null,
      toAccount: inc.account ? { id: inc.account.id, name: inc.account.name, icon: inc.account.icon } : null,
    };
  });

  return Response.json({
    account: { id: account.id, name: account.name, icon: account.icon },
    items,
  });
}
