import { getClientAddress } from "@/lib/login-rate-limit";

export const REAUTH_RATE_LIMIT_POLICY = {
  scope: "reauthentication",
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
} as const;

export function getReauthRateLimitKeys(
  request: Request,
  userId: string
): string[] {
  return [
    `user:${userId}`,
    `ip:${getClientAddress(request).trim().toLowerCase()}`,
  ];
}

export function reauthRateLimitResponse(retryAfter: number): Response {
  return Response.json(
    { error: "Too many password attempts. Try again later." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
