/**
 * Minimal in-memory fixed-window (reset-at-window-end) rate limiter for
 * non-critical engagement counters (view/share). Best-effort: on serverless
 * each instance keeps its own bucket, so this reduces abuse rather than
 * eliminating it. The DB unique constraints and the client sessionStorage
 * guard remain the backstops.
 *
 * Memory is bounded: when the bucket Map exceeds MAX_BUCKETS, expired
 * entries are pruned first; if still at capacity, the oldest entry is
 * evicted (Map preserves insertion order).
 */
const MAX_BUCKETS = 1000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

export function checkAndIncrement(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();

  // Bound memory: prune expired entries when at capacity
  if (buckets.size >= MAX_BUCKETS) {
    pruneExpired(now);
    // If still at capacity after pruning, evict the oldest entry
    if (buckets.size >= MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value!;
      buckets.delete(oldestKey);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function resetLimits(): void {
  buckets.clear();
}

/**
 * Best-effort client key: forwarded IP if present, else "unknown".
 * The "unknown" fallback is safe in production behind Vercel (which always
 * sets x-forwarded-for); it only matters as a dev/local edge case where all
 * unproxied requests share one bucket.
 */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Exposed for testing. */
export function getBucketCount(): number {
  return buckets.size;
}
