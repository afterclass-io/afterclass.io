import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

import { env } from "@/env";

/**
 * Pooled vs transactional Prisma clients (pgbouncer-transaction safety).
 *
 * - `db` — pooled app client over `DATABASE_URL`. All plain reads/writes
 *   (no interactive `$transaction`) go here. Its `PrismaPg` adapter owns
 *   pooling (`max: dev ? 2 : 5`, timeouts below); on Supabase this points at
 *   the pooled `:6543?pgbouncer=true` port (see `.env.example`).
 * - `txDb` (alias `directDb`) — transactional client over `DIRECT_URL`
 *   (direct `:5432`, no pgbouncer flag). Every interactive `$transaction`
 *   (`quota.ts`, `ratelimit.ts`) MUST use this: interactive transactions on
 *   the pooled port break (prepared-statement / transaction-mode conflicts).
 *
 * DIRECT_URL requiredness: REQUIRED in production only (checked at runtime
 * below, not in the env schema — build-time validation cannot require
 * runtime secrets). Local dev/tests keep env.ts's optional DIRECT_URL: when
 * unset, `txDb` falls back to the pooled client with a dev-only warning so
 * local dev and unit tests never throw at import.
 */
const createPooledClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      max: env.NODE_ENV === "development" ? 2 : 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    }),
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const createDirectClient = (connectionString: string) =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    }),
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPooledClient> | undefined;
  prismaTx: ReturnType<typeof createPooledClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPooledClient();

const directUrl = env.DIRECT_URL;
if (!directUrl && env.NODE_ENV === "production") {
  throw new Error(
    "DIRECT_URL is required in production (transactional Prisma client needs the direct connection); set it in production env.",
  );
}
if (!directUrl && env.NODE_ENV !== "production") {
  // intentional: dev/test fallback so local dev and unit tests pass
  // without a direct connection string; transactions still run, just pooled.
  console.warn(
    "[db] DIRECT_URL is unset — txDb falls back to the pooled client (dev/test only).",
  );
}

export const txDb =
  globalForPrisma.prismaTx ?? (directUrl ? createDirectClient(directUrl) : db);

/** Alias for the transactional/direct client (call sites use either name). */
export const directDb = txDb;

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaTx = txDb;
}
