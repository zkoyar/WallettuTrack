import { requireUserId, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { MAX_EMAIL_LENGTH } from "@/lib/financial-constraints";
import { bcryptPasswordSchema } from "@/lib/password-policy";
import { readJsonBody } from "@/lib/request-body";
import {
  getReauthRateLimitKeys,
  REAUTH_RATE_LIMIT_POLICY,
  reauthRateLimitResponse,
} from "@/lib/reauth-rate-limit";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit-store";

const MAX_DELETE_BODY_BYTES = 16 * 1024;
const deleteAccountSchema = z.object({
  confirmEmail: z.email().max(MAX_EMAIL_LENGTH),
  currentPassword: bcryptPasswordSchema.min(1),
});

/**
 * DELETE /api/account permanently deletes the account and all related data
 * through cascading foreign keys after password reauthentication.
 */
export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const body = await readJsonBody(req, MAX_DELETE_BODY_BYTES);
  if (!body.ok && body.reason === "too_large") {
    return jsonError("Request too large", 413);
  }
  const parsed = deleteAccountSchema.safeParse(body.ok ? body.value : null);
  if (!parsed.success) return jsonError("Invalid confirmation", 422);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) return jsonError("User not found", 404);

  if (parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return jsonError(
      "Invalid confirmation: enter the account email to continue",
      422
    );
  }

  const rateLimitKeys = getReauthRateLimitKeys(req, userId);
  const rateLimit = await consumeRateLimit(
    REAUTH_RATE_LIMIT_POLICY,
    rateLimitKeys
  );
  if (rateLimit.blocked) return reauthRateLimitResponse(rateLimit.retryAfter);

  const passwordMatches = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!passwordMatches) return jsonError("Incorrect current password", 403);

  await resetRateLimit(REAUTH_RATE_LIMIT_POLICY, rateLimitKeys);
  await db.user.delete({ where: { id: userId } });
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
