import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb, { type Pool } from "mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { withDatabasePoolDefaults } from "@/lib/database-url";

interface DatabaseState {
  pool: Pool;
  client: PrismaClient;
  facade?: PrismaClient;
  reconnectPromise?: Promise<void>;
}

const globalForPrisma = globalThis as unknown as {
  wallettuTrackDbState?: DatabaseState;
};

function createDatabase(): { pool: Pool; client: PrismaClient } {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured in .env");
  const poolUrl = new URL(withDatabasePoolDefaults(url));
  if (poolUrl.protocol === "mysql:") poolUrl.protocol = "mariadb:";
  if (poolUrl.hostname.startsWith("[") && poolUrl.hostname.endsWith("]")) {
    poolUrl.hostname = encodeURIComponent(poolUrl.hostname.slice(1, -1));
  }

  const pool = mariadb.createPool(poolUrl.toString());
  const adapter = new PrismaMariaDb(pool);
  return { pool, client: new PrismaClient({ adapter }) };
}

const state: DatabaseState =
  globalForPrisma.wallettuTrackDbState ?? createDatabase();

/**
 * Next.js server bundles share this facade. Every access is forwarded to the
 * current client so a failed pool can be replaced without leaving other route
 * handlers with a reference to the previous client.
 */
const facade =
  state.facade ??
  new Proxy({} as PrismaClient, {
    get(_target, property) {
      const value = Reflect.get(state.client, property, state.client);
      return typeof value === "function" ? value.bind(state.client) : value;
    },
  });
state.facade = facade;

export const db: PrismaClient = facade;
globalForPrisma.wallettuTrackDbState = state;

async function replaceDatabaseClient(): Promise<void> {
  const replacement = createDatabase();
  try {
    await replacement.client.$connect();
    await replacement.client.$queryRaw`SELECT 1`;
  } catch (error) {
    await replacement.client.$disconnect().catch(() => undefined);
    await replacement.pool.end().catch(() => undefined);
    throw error;
  }

  const previous = { client: state.client, pool: state.pool };
  state.client = replacement.client;
  state.pool = replacement.pool;
  void previous.client
    .$disconnect()
    .catch(() => undefined)
    .then(() => previous.pool.end().catch(() => undefined));
}

/** Verifies MySQL and replaces an unrecoverable pool in a serialized operation. */
export async function verifyDatabaseConnection(): Promise<void> {
  try {
    await db.$queryRaw`SELECT 1`;
    return;
  } catch {
    if (!state.reconnectPromise) {
      state.reconnectPromise = replaceDatabaseClient().finally(() => {
        state.reconnectPromise = undefined;
      });
    }
    await state.reconnectPromise;
  }
}
