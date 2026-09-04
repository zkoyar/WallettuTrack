import { requireUserId, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  bcryptPasswordSchema,
  MIN_PASSWORD_CHARACTERS,
} from "@/lib/password-policy";
import { readJsonBody } from "@/lib/request-body";
import {
  getReauthRateLimitKeys,
  REAUTH_RATE_LIMIT_POLICY,
  reauthRateLimitResponse,
} from "@/lib/reauth-rate-limit";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit-store";

const MAX_PASSWORD_BODY_BYTES = 16 * 1024;

const passwordSchema = z
  .object({
    currentPassword: bcryptPasswordSchema.min(1, "Current password is required"),
    newPassword: bcryptPasswordSchema.min(
      MIN_PASSWORD_CHARACTERS,
      "The new password must be at least 12 characters"
    ),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "The new password must differ from the current password",
    path: ["newPassword"],
  });

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readJsonBody(request, MAX_PASSWORD_BODY_BYTES);
  if (!body.ok && body.reason === "too_large") {
    return jsonError("Request too large", 413);
  }
  if (!body.ok) return jsonError("Invalid request body");

  const parsed = passwordSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const rateLimitKeys = getReauthRateLimitKeys(request, userId);
  const rateLimit = await consumeRateLimit(
    REAUTH_RATE_LIMIT_POLICY,
    rateLimitKeys
  );
  if (rateLimit.blocked) {
    return reauthRateLimitResponse(rateLimit.retryAfter);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return jsonError("User not found", 404);

  const passwordMatches = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!passwordMatches) return jsonError("Incorrect current password", 403);

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  await resetRateLimit(REAUTH_RATE_LIMIT_POLICY, rateLimitKeys);

  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
