import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { z } from "zod";
import { readApiJsonBody } from "@/lib/request-body";

const ruleSchema = z.object({
  keyword: z.string().trim().min(2, "Keyword is too short").max(50),
  categoryId: z.string().cuid("Category is required"),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const rules = await db.categoryRule.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    items: rules.map((r) => ({
      id: r.id,
      keyword: r.keyword,
      categoryId: r.categoryId,
      category: {
        id: r.category.id,
        name: r.category.name,
        color: r.category.color,
        icon: r.category.icon,
        type: r.category.type,
      },
    })),
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = ruleSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const cat = await db.category.findFirst({
    where: { id: parsed.data.categoryId, userId },
  });
  if (!cat) return jsonError("Category not found", 404);

  const dup = await db.categoryRule.findFirst({
    where: { userId, keyword: parsed.data.keyword.toLowerCase() },
  });
  if (dup) return jsonError("A rule already exists for this keyword", 409);

  const created = await db.categoryRule.create({
    data: {
      userId,
      categoryId: cat.id,
      keyword: parsed.data.keyword.toLowerCase(),
    },
    include: { category: true },
  });

  return Response.json({ ok: true, item: created }, { status: 201 });
}
