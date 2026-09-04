import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { transactionSchema } from "@/lib/validators";
import { getStoredConversion } from "@/lib/rates";
import { parseDateOnly } from "@/lib/dates";
import { serializeTransaction } from "@/lib/serializers";
import type { CategoryType } from "@/generated/prisma/client";
import { getSelectedAccount } from "@/lib/selected-account";
import { readApiJsonBody } from "@/lib/request-body";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const selectedAccount = await getSelectedAccount(userId);
  if (!selectedAccount) return jsonError("No account available", 409);

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const categoryId = url.searchParams.get("categoryId");
  const requestedAccountId = url.searchParams.get("accountId");
  const accountId = requestedAccountId ?? selectedAccount.id;
  const tagId = url.searchParams.get("tagId");
  const type = url.searchParams.get("type");
  const currency = url.searchParams.get("currency");
  const q = url.searchParams.get("q");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    100,
    Math.max(5, Number(url.searchParams.get("pageSize") ?? "25"))
  );

  const where = {
    userId,
    ...(from && /^\d{4}-\d{2}-\d{2}$/.test(from)
      ? { date: { gte: parseDateOnly(from) } }
      : {}),
    ...(to && /^\d{4}-\d{2}-\d{2}$/.test(to)
      ? {
          date: {
            ...(from && /^\d{4}-\d{2}-\d{2}$/.test(from)
              ? { gte: parseDateOnly(from) }
              : {}),
            lte: parseDateOnly(to),
          },
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(tagId ? { tagLinks: { some: { tagId } } } : {}),
    ...(accountId
      ? { accountId: accountId === "-" ? null : accountId }
      : {}),
    ...(type === "EXPENSE" || type === "INCOME"
      ? { type: type as CategoryType }
      : {}),
    ...(currency ? { currency } : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q } },
            { notes: { contains: q } },
            { tagLinks: { some: { tag: { name: { contains: q } } } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
        tagLinks: { include: { tag: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.transaction.count({ where }),
  ]);

  return Response.json({
    items: items.map(serializeTransaction),
    total,
    page,
    pageSize,
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const selectedAccount = await getSelectedAccount(userId);
  if (!selectedAccount) return jsonError("No account available", 409);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = transactionSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const data = parsed.data;
  const tagIds = [...new Set(data.tagIds ?? [])];

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  if (!user) return jsonError("User not found", 404);

  let categoryId: string | null = null;
  let accountId: string | null = selectedAccount.id;
  let type: "EXPENSE" | "INCOME" = data.type;
  if (data.categoryId) {
    const cat = await db.category.findFirst({
      where: { id: data.categoryId, userId },
    });
    if (!cat) return jsonError("Category not found", 404);
    categoryId = cat.id;
    type = cat.type;
  }
  if (data.accountId) {
    const acc = await db.account.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!acc) return jsonError("Account not found", 404);
    accountId = acc.id;
  }
  if (tagIds.length > 0) {
    const ownedTags = await db.tag.count({
      where: { userId, id: { in: tagIds } },
    });
    if (ownedTags !== tagIds.length) return jsonError("Tag not found", 404);
  }

  let conversion: Awaited<ReturnType<typeof getStoredConversion>>;
  try {
    conversion = await getStoredConversion(
      data.amount,
      data.currency,
      user.baseCurrency
    );
  } catch {
    return jsonError("The amount cannot be converted to the primary currency", 422);
  }

  const created = await db.transaction.create({
    data: {
      userId,
      categoryId,
      accountId,
      type,
      amount: data.amount,
      currency: data.currency,
      amountBase: conversion.amountBase,
      exchangeRate: conversion.exchangeRate,
      date: parseDateOnly(data.date),
      description: data.description || null,
      notes: data.notes || null,
      tagLinks: {
        create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
      },
    },
    include: {
      category: true,
      account: true,
      tagLinks: { include: { tag: true } },
    },
  });

  return Response.json(
    { ok: true, item: serializeTransaction(created) },
    { status: 201 }
  );
}
