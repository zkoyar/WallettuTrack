import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, requireUserId } from "@/lib/api-helpers";
import { serializeAccount } from "@/lib/serializers";
import {
  SELECTED_ACCOUNT_COOKIE,
  getSelectedAccount,
} from "@/lib/selected-account";
import { readApiJsonBody } from "@/lib/request-body";

const selectionSchema = z.object({
  accountId: z.string().cuid(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const account = await getSelectedAccount(userId);
  if (!account) return jsonError("No account available", 404);
  return Response.json({ item: account });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readApiJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = selectionSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("Invalid account", 422);

  const account = await db.account.findFirst({
    where: { id: parsed.data.accountId, userId },
  });
  if (!account) return jsonError("Account not found", 404);

  (await cookies()).set({
    name: SELECTED_ACCOUNT_COOKIE,
    value: account.id,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return Response.json({ ok: true, item: serializeAccount(account) });
}
