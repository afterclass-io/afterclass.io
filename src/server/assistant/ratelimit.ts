import { db } from "@/server/db";

/**
 * Fixed-window per-key counter with atomic check+increment (Task 7 notes).
 *
 * Window semantics: FIXED windows (`windowStart` = floor(now / windowMs) *
 * windowMs, one `RateLimit` row per `<key>:<windowStart>`). A caller can
 * burst up to 2× the limit at a window boundary (last second of window N +
 * first second of window N+1). This is DOCUMENTED and accepted: the buckets
 * guard cost/nuisance (chat turns, tool writes, ical spray), not hard
 * real-time fairness — the atomic conditional `updateMany WHERE count < limit`
 * still makes every window's cap exact under concurrency (no lost-update
 * overshoot within a window). A sliding-window upgrade would cost a
 * read-modify-write per call; revisit only if boundary bursts show up in
 * abuse review.
 *
 * Row lifecycle: windows rotate every minute, so stale rows accumulate one
 * per key per minute. `pruneRateLimits()` deletes rows older than
 * `retentionWindows` (default: keep ~24h of windows for forensics, delete
 * the rest). Wire it to a cron: Vercel Cron (`vercel.json` `crons`) or
 * `pg_cron` hitting a secured internal endpoint, or a nightly job runner —
 * any scheduler that can import this module. Until wired, rows are harmless
 * (tiny, keyed, indexed by PK) but unbounded — the pruning helper is the
 * code-safe part; the schedule itself is a deploy concern (see report).
 */
export async function checkAndIncrement(
  key: string,
  limit: number,
  windowMinutes: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const windowMs = windowMinutes * 60_000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const rowKey = `${key}:${windowStart}`;

  return db.$transaction(async (tx) => {
    // Ensure a row exists for this window (idempotent no-op if present).
    await tx.rateLimit.upsert({
      where: { key: rowKey },
      create: { key: rowKey, windowStart: BigInt(windowStart), count: 0 },
      update: {},
    });
    // Conditional increment - only when still under limit. The WHERE + increment
    // is atomic; concurrent callers cannot both read `count < limit` and both
    // increment (only one UPDATE matches, the other sees count 0 and is blocked).
    const result = await tx.rateLimit.updateMany({
      where: { key: rowKey, count: { lt: limit } },
      data: { count: { increment: 1 } },
    });
    if (result.count === 0) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - Date.now()) / 1000));
      return { ok: false, retryAfterSeconds };
    }
    return { ok: true, retryAfterSeconds: 0 };
  });
}

/**
 * GC for `RateLimit` rows (Task 7). Deletes windows older than
 * `retentionWindows` (default 1440 = ~24h of 1-minute windows). Returns the
 * deleted count. Idempotent and safe to run on any schedule — live windows
 * are always newer than the cutoff, so pruning can never touch an active
 * bucket. Cron wiring (Vercel Cron / pg_cron / job runner) is a deploy
 * concern; this helper is the code-safe part.
 */
export async function pruneRateLimits(
  retentionWindows = 1440,
  windowMinutes = 1,
): Promise<{ deleted: number }> {
  const windowMs = windowMinutes * 60_000;
  const cutoff = BigInt(Math.floor(Date.now() / windowMs) * windowMs - retentionWindows * windowMs);
  const res = await db.rateLimit.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
  return { deleted: res.count };
}
