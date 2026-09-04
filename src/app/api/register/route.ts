import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { getClientAddress } from "@/lib/login-rate-limit";
import { consumeRateLimit } from "@/lib/rate-limit-store";
import { getRegistrationMode } from "@/lib/registration";
import { registerSchema } from "@/lib/validators";
import { readJsonBody } from "@/lib/request-body";

const MAX_REGISTRATION_BODY_BYTES = 16 * 1024;
const REGISTRATION_POLICY = {
  scope: "registration",
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
} as const;

class RegistrationUnavailableError extends Error {}
class DuplicateEmailError extends Error {}

export async function POST(request: Request) {
  const mode = getRegistrationMode();
  if (mode === "closed") return jsonError("Registration unavailable", 403);
  if (mode === "first-user" && (await db.user.count()) > 0) {
    return jsonError("Registration unavailable", 403);
  }

  const registrationLimit = await consumeRateLimit(REGISTRATION_POLICY, [
    `ip:${getClientAddress(request)}`,
  ]);
  if (registrationLimit.blocked) {
    return Response.json(
      { error: "Too many registration requests. Try again later." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(registrationLimit.retryAfter),
        },
      }
    );
  }

  const body = await readJsonBody(request, MAX_REGISTRATION_BODY_BYTES);
  if (!body.ok && body.reason === "too_large") {
    return jsonError("Request too large", 413);
  }
  const parsed = registerSchema.safeParse(body.ok ? body.value : null);
  if (!parsed.success) {
    return jsonError("Invalid data", 422);
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let user: { id: string; email: string; name: string | null } | null = null;

  for (let attempt = 0; attempt < 2 && !user; attempt++) {
    try {
      user = await db.$transaction(
        async (tx) => {
          if (mode === "first-user" && (await tx.user.count()) > 0) {
            throw new RegistrationUnavailableError();
          }
          if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
            throw new DuplicateEmailError();
          }

          return tx.user.create({
            data: {
              email,
              name: parsed.data.name,
              passwordHash,
              categories: {
                create: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
              },
              accounts: {
                create: { name: "Main account", icon: "🏦" },
              },
            },
            select: { id: true, email: true, name: true },
          });
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (error instanceof RegistrationUnavailableError) {
        return jsonError("Registration unavailable", 403);
      }
      if (
        error instanceof DuplicateEmailError ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      ) {
        return jsonError("Email is already registered", 409);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt === 0
      ) {
        continue;
      }
      throw error;
    }
  }

  if (!user) return jsonError("Registration failed", 503);
  return Response.json({ ok: true, user }, { status: 201 });
}
