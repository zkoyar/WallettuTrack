import { db } from "@/lib/db";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { categorySchema } from "@/lib/validators";
import { readApiJsonBody } from "@/lib/request-body";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const categories = await db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return Response.json({ items: categories });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = categorySchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const existing = await db.category.findFirst({
    where: { userId, name: parsed.data.name },
  });
  if (existing) return jsonError("A category with this name already exists", 409);

  const created = await db.category.create({
    data: { ...parsed.data, userId },
  });

  return Response.json({ ok: true, item: created }, { status: 201 });
}
