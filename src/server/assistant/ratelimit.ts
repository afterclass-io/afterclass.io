import { db } from "@/server/db";

/**
 * Fixed-window per-key counter with atomic check+increment.
 *
 * Window semantics: FIXED windows (`windowStart` = floor(now / windowMs) *
 * windowMs, one `rate_limit` row per `<key>:<windowStart>`). A caller can
 * burst up to 2× the limit at a window boundary (last second of window N +
 * first second of window N+1). This is DOCUMENTED and accepted: the buckets
 * guard cost/nuisance (chat turns, tool writes, ical spray), not hard
 * real-time fairness — a single atomic SQL statement
 * (`INSERT ... ON CONFLICT DO UPDATE ... WHERE r."count" < limit RETURNING r."count"`)
 * on the pooled client makes every window's cap exact under concurrency
 * (no lost-update overshoot within a window). A sliding-window upgrade would
 * cost a read-modify-write per call; revisit only if boundary bursts show up in
 * abuse review.
 *
 * Row lifecycle: windows rotate every minute, so stale rows accumulate one
 * per key per minute. `pruneRateLimits()` deletes rows older than
 * `retentionWindows` (default: keep ~24h of windows for forensics, delete
 * the rest). Wire it to a cron: Vercel Cron (`vercel.json` `crons`) or
 * `pg_cron` hitting a secured internal endpoint, or a nightly job runner —
 * any scheduler that can import this module. Until wired, rows are harmless
 * (tiny, keyed, indexed by PK) but unbounded.
 */
function windowFor(
  key: string,
  windowMinutes: number,
  atMs = Date.now(),
): {
  windowMs: number;
  windowStart: number;
  rowKey: string;
} {
  const windowMs = windowMinutes * 60_000;
  const windowStart = Math.floor(atMs / windowMs) * windowMs;
  const rowKey = `${key}:${windowStart}`;
  return { windowMs, windowStart, rowKey };
}

function retryAfterSeconds(windowStart: number, windowMs: number): number {
  return Math.max(1, Math.ceil((windowStart + windowMs - Date.now()) / 1000));
}

/** Read-only. Never creates or increments a row. */
export async function peekRateLimit(
  key: string,
  limit: number,
  windowMinutes: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const { windowMs, windowStart, rowKey } = windowFor(key, windowMinutes);
  const row = await db.rateLimitWindow.findUnique({
    where: { key: rowKey },
    select: { count: true },
  });
  const ok = (row?.count ?? 0) < limit;
  return {
    ok,
    retryAfterSeconds: ok ? 0 : retryAfterSeconds(windowStart, windowMs),
  };
}

export async function checkAndIncrement(
  key: string,
  limit: number,
  windowMinutes: number,
  atMs = Date.now(),
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const { windowMs, windowStart, rowKey } = windowFor(key, windowMinutes, atMs);
  const retryAfter = retryAfterSeconds(windowStart, windowMs);
  // A limit below 1 admits nobody. This keeps the old contract and skips the DB.
  if (limit < 1) return { ok: false, retryAfterSeconds: retryAfter };

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit" AS r ("key", "window_start", "count", "updated_at")
    VALUES (${rowKey}::text, ${BigInt(windowStart)}::bigint, 1, (now() AT TIME ZONE 'UTC'))
    ON CONFLICT ("key") DO UPDATE
      SET "count" = r."count" + 1,
          "updated_at" = (now() AT TIME ZONE 'UTC')
      WHERE r."count" < ${limit}::int
    RETURNING r."count"`;
  return rows.length > 0
    ? { ok: true, retryAfterSeconds: 0 }
    : { ok: false, retryAfterSeconds: retryAfter };
}

/**
 * Gives back one unit in the window acquired at `acquiredAt`.
 * A caller uses it to undo a claim it cannot act on. It never drops the
 * count below zero and it creates no row.
 */
export async function releaseRateLimit(
  key: string,
  windowMinutes: number,
  acquiredAt: number,
): Promise<void> {
  const { rowKey } = windowFor(key, windowMinutes, acquiredAt);
  await db.$executeRaw`
    UPDATE "rate_limit"
    SET "count" = GREATEST("count" - 1, 0),
        "updated_at" = (now() AT TIME ZONE 'UTC')
    WHERE "key" = ${rowKey}::text`;
}

const PRUNE_BATCH_SIZE = 1000;
const PRUNE_TIME_BUDGET_MS = 8_000; // vercel.json caps src/app/api/** at 10 s

/**
 * GC for `RateLimitWindow` rows. Deletes windows older than
 * `retentionWindows` (default 1440 = ~24h of 1-minute windows; canonical
 * value lives in `src/server/config/chat-config.ts` as
 * `rateLimitRetentionWindows` — keep both at 1440). Returns the
 * deleted count. Idempotent and safe to run on any schedule — live windows
 * are always newer than the cutoff, so pruning can never touch an active
 * bucket. Cron wiring (Vercel Cron / pg_cron / job runner) is a deploy
 * concern; this helper is the code-safe part.
 */
export async function pruneRateLimits(
  retentionWindows = 1440,
  windowMinutes = 1,
  batchSize = PRUNE_BATCH_SIZE,
): Promise<{ deleted: number }> {
  const windowMs = windowMinutes * 60_000;
  const cutoff = BigInt(
    Math.floor(Date.now() / windowMs) * windowMs - retentionWindows * windowMs,
  );
  const deadline = Date.now() + PRUNE_TIME_BUDGET_MS;
  let deleted = 0;
  for (;;) {
    const n = await db.$executeRaw`
      DELETE FROM "rate_limit"
      WHERE "key" IN (
        SELECT "key" FROM "rate_limit"
        WHERE "window_start" < ${cutoff}::bigint
        ORDER BY "window_start"
        LIMIT ${batchSize}::int
        FOR UPDATE SKIP LOCKED
      )`;
    deleted += n;
    if (n < batchSize || Date.now() >= deadline) return { deleted };
  }
}
