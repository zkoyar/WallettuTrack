import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { budgetSchema } from "@/lib/validators";
import { getSelectedAccount } from "@/lib/selected-account";
import { readApiJsonBody } from "@/lib/request-body";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);
  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 409);

  const budgets = await db.budget.findMany({
    where: { userId, accountId: account.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    items: budgets.map((b) => ({
      ...b,
      amount: Number(b.amount),
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

  const parsed = budgetSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }
  const data = parsed.data;

  const cat = await db.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!cat) return jsonError("Category not found", 404);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });

  // Allow only one budget per category and period.
  const dup = await db.budget.findFirst({
    where: { userId, accountId: account.id, categoryId: data.categoryId, period: data.period },
  });
  if (dup) return jsonError("A budget already exists for this category and period", 409);

  const created = await db.budget.create({
    data: {
      ...data,
      currency: user?.baseCurrency ?? "EUR",
      userId,
      accountId: account.id,
    },
    include: { category: true },
  });

  return Response.json({ ok: true, item: { ...created, amount: Number(created.amount) } }, { status: 201 });
}
