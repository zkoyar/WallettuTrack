import { MAX_EMAIL_LENGTH } from "@/lib/financial-constraints";
import { readBodyText } from "@/lib/request-body";

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_LOGIN_BODY_BYTES = 16 * 1024;
export const LOGIN_RATE_LIMIT_POLICY = {
  scope: "login",
  maxAttempts: MAX_LOGIN_ATTEMPTS,
  windowMs: LOGIN_WINDOW_MS,
} as const;
const MAX_TRACKED_KEYS = 10_000;

interface AttemptRecord {
  count: number;
  firstAt: number;
}

export interface LoginRateLimiter {
  check: (key: string, now?: number) => { blocked: boolean; retryAfter: number };
  failure: (key: string, now?: number) => void;
  reset: (key: string) => void;
}

export function createLoginRateLimiter(
  maxAttempts = MAX_LOGIN_ATTEMPTS,
  windowMs = LOGIN_WINDOW_MS
): LoginRateLimiter {
  const attempts = new Map<string, AttemptRecord>();

  function activeRecord(key: string, now: number): AttemptRecord | null {
    const record = attempts.get(key);
    if (!record) return null;
    if (now - record.firstAt >= windowMs) {
      attempts.delete(key);
      return null;
    }
    return record;
  }

  return {
    check(key, now = Date.now()) {
      const record = activeRecord(key, now);
      if (!record || record.count < maxAttempts) {
        return { blocked: false, retryAfter: 0 };
      }
      return {
        blocked: true,
        retryAfter: Math.max(1, Math.ceil((windowMs - (now - record.firstAt)) / 1000)),
      };
    },
    failure(key, now = Date.now()) {
      const record = activeRecord(key, now);
      if (record) record.count += 1;
      else {
        if (attempts.size >= MAX_TRACKED_KEYS) {
          for (const existingKey of attempts.keys()) {
            if (!activeRecord(existingKey, now)) continue;
            attempts.delete(existingKey);
            break;
          }
        }
        attempts.set(key, { count: 1, firstAt: now });
      }
    },
    reset(key) {
      attempts.delete(key);
    },
  };
}

export const loginRateLimiter = createLoginRateLimiter();

export interface LoginRateLimitContext {
  keys: string[];
  bodyTooLarge: boolean;
}

export async function getLoginRateLimitContext(
  request: Request
): Promise<LoginRateLimitContext | null> {
  const url = new URL(request.url);
  if (!/\/api\/auth\/callback\/credentials\/?$/.test(url.pathname)) return null;

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const ip = getClientAddress(request);
  const keys = [`ip:${ip.toLowerCase()}`];
  const body = await readBodyText(request.clone(), MAX_LOGIN_BODY_BYTES);
  if (!body.ok) {
    return { keys, bodyTooLarge: body.reason === "too_large" };
  }

  let email: unknown;
  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(body.text) as unknown;
      email = json && typeof json === "object" && "email" in json ? json.email : null;
    } catch {
      email = null;
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    email = new URLSearchParams(body.text).get("email");
  }

  if (typeof email === "string" && email.trim()) {
    keys.push(`email:${email.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH)}`);
  }
  return { keys, bodyTooLarge: false };
}

/**
 * The application is reachable only through the local reverse proxy. The proxy
 * must overwrite X-Real-IP. The final XFF entry is used as a fallback so values
 * prepended by the client are not trusted.
 */
export function getClientAddress(request: Request): string {
  const directHeaders = ["x-real-ip", "cf-connecting-ip"];
  for (const name of directHeaders) {
    const value = request.headers.get(name)?.trim();
    if (value) return value;
  }

  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return forwarded?.at(-1) ?? "unknown";
}

/** A credential sign-in is successful only when Auth.js creates a session. */
export function isSuccessfulCredentialsResponse(response: Response): boolean {
  const cookies = response.headers.getSetCookie();
  return cookies.some((cookie) =>
    /(?:^|;\s*)(?:(?:__Secure|__Host)-)?authjs\.session-token=/.test(cookie)
  );
}

export function rateLimitResponse(request: Request, retryAfter: number): Response {
  const url = new URL("/login?error=RateLimit", request.url).toString();
  return Response.json(
    { error: "Too many sign-in attempts. Try again later.", url },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
