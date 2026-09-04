import { z } from "zod";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { readApiJsonBody } from "@/lib/request-body";

const tagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .default("#6366f1"),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const items = await db.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  return Response.json({ items });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = tagSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const duplicate = await db.tag.findFirst({
    where: { userId, name: parsed.data.name },
    select: { id: true },
  });
  if (duplicate) return jsonError("Tag already exists", 409);

  const item = await db.tag.create({
    data: { userId, ...parsed.data },
    select: { id: true, name: true, color: true },
  });
  return Response.json({ ok: true, item }, { status: 201 });
}
