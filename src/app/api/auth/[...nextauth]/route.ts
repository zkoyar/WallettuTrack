import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";
import {
  getLoginRateLimitContext,
  isSuccessfulCredentialsResponse,
  LOGIN_RATE_LIMIT_POLICY,
  rateLimitResponse,
} from "@/lib/login-rate-limit";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit-store";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  const context = await getLoginRateLimitContext(request);
  if (!context) return handlers.POST(request);
  if (context.bodyTooLarge) {
    return Response.json(
      { error: "Request too large" },
      { status: 413, headers: { "Cache-Control": "no-store" } }
    );
  }
  const { keys } = context;

  // Reserve the attempt before the password check so concurrent requests
  // cannot all pass a separate read-before-write rate-limit check.
  const limit = await consumeRateLimit(LOGIN_RATE_LIMIT_POLICY, keys);
  if (limit.blocked) return rateLimitResponse(request, limit.retryAfter);

  const response = await handlers.POST(request);
  // CSRF/configuration errors are not proof of a successful login and must not
  // reset the counters. Auth.js sets the session cookie only on success.
  if (isSuccessfulCredentialsResponse(response)) {
    await resetRateLimit(LOGIN_RATE_LIMIT_POLICY, keys);
  }
  return response;
}
