const POOL_DEFAULTS = {
  connectionLimit: "5",
  minimumIdle: "1",
  idleTimeout: "300",
  connectTimeout: "2000",
  acquireTimeout: "5000",
  // Required by caching_sha2_password after a MySQL 8.4 restart. The database
  // network must remain private as enforced by Compose and the checklist.
  allowPublicKeyRetrieval: "true",
} as const;

/**
 * Applies conservative pool limits without overriding explicit DATABASE_URL
 * options. Errors are intentionally generic so connection credentials are not
 * exposed.
 */
export function withDatabasePoolDefaults(connectionString: string): string {
  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Invalid DATABASE_URL");
  }

  if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") {
    throw new Error("DATABASE_URL must use the mysql or mariadb protocol");
  }

  for (const [name, value] of Object.entries(POOL_DEFAULTS)) {
    if (!url.searchParams.has(name)) url.searchParams.set(name, value);
  }

  return url.toString();
}
