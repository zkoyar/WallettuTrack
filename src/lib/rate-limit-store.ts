import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export interface RateLimitPolicy {
  scope: string;
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitStatus {
  blocked: boolean;
  retryAfter: number;
}

function keyHash(scope: string, identifier: string): string {
  return createHash("sha256")
    .update(`${scope}\0${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

function hashes(policy: RateLimitPolicy, identifiers: string[]): string[] {
  return [...new Set(identifiers.map((value) => keyHash(policy.scope, value)))];
}

function statusFromRows(
  rows: Array<{ attempts: number; expiresAt: Date }>,
  policy: RateLimitPolicy,
  now: Date,
  inclusive = true
): RateLimitStatus {
  const blockedRows = rows.filter((row) =>
    inclusive
      ? row.attempts >= policy.maxAttempts
      : row.attempts > policy.maxAttempts
  );
  if (blockedRows.length === 0) return { blocked: false, retryAfter: 0 };

  const retryAfter = Math.max(
    1,
    ...blockedRows.map((row) =>
      Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000)
    )
  );
  return { blocked: true, retryAfter };
}

export async function checkRateLimit(
  policy: RateLimitPolicy,
  identifiers: string[],
  now = new Date()
): Promise<RateLimitStatus> {
  const keyHashes = hashes(policy, identifiers);
  if (keyHashes.length === 0) return { blocked: false, retryAfter: 0 };

  const rows = await db.rateLimitBucket.findMany({
    where: { keyHash: { in: keyHashes }, expiresAt: { gt: now } },
    select: { attempts: true, expiresAt: true },
  });
  return statusFromRows(rows, policy, now);
}

async function incrementBuckets(
  policy: RateLimitPolicy,
  identifiers: string[],
  now: Date
): Promise<Array<{ attempts: number; expiresAt: Date }>> {
  const keyHashes = hashes(policy, identifiers);
  if (keyHashes.length === 0) return [];
  const expiresAt = new Date(now.getTime() + policy.windowMs);

  await db.$transaction([
    db.rateLimitBucket.deleteMany({ where: { expiresAt: { lte: now } } }),
    ...keyHashes.map((hash) =>
      db.$executeRaw`
        INSERT INTO \`RateLimitBucket\`
          (\`keyHash\`, \`scope\`, \`attempts\`, \`windowStartedAt\`, \`expiresAt\`, \`updatedAt\`)
        VALUES
          (${hash}, ${policy.scope}, 1, ${now}, ${expiresAt}, ${now})
        ON DUPLICATE KEY UPDATE
          \`attempts\` = IF(\`expiresAt\` <= ${now}, 1, \`attempts\` + 1),
          \`windowStartedAt\` = IF(\`expiresAt\` <= ${now}, ${now}, \`windowStartedAt\`),
          \`expiresAt\` = IF(\`expiresAt\` <= ${now}, ${expiresAt}, \`expiresAt\`),
          \`scope\` = ${policy.scope},
          \`updatedAt\` = ${now}
      `
    ),
  ]);

  return db.rateLimitBucket.findMany({
    where: { keyHash: { in: keyHashes }, expiresAt: { gt: now } },
    select: { attempts: true, expiresAt: true },
  });
}

/** Records a failure after the current attempt has already been handled. */
export async function recordRateLimitFailure(
  policy: RateLimitPolicy,
  identifiers: string[],
  now = new Date()
): Promise<void> {
  await incrementBuckets(policy, identifiers, now);
}

/** Consumes an attempt and blocks the one that exceeds the limit. */
export async function consumeRateLimit(
  policy: RateLimitPolicy,
  identifiers: string[],
  now = new Date()
): Promise<RateLimitStatus> {
  const rows = await incrementBuckets(policy, identifiers, now);
  return statusFromRows(rows, policy, now, false);
}

export async function resetRateLimit(
  policy: RateLimitPolicy,
  identifiers: string[]
): Promise<void> {
  const keyHashes = hashes(policy, identifiers);
  if (keyHashes.length === 0) return;
  await db.rateLimitBucket.deleteMany({ where: { keyHash: { in: keyHashes } } });
}
