/**
 * Best-effort client key: forwarded IP if present, else "unknown".
 * The "unknown" fallback is safe in production behind Vercel (which always
 * sets x-forwarded-for); it only matters as a dev/local edge case where all
 * unproxied requests share one bucket.
 */
export function clientKey(headers: Headers): string {
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
