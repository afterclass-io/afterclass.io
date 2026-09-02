/**
 * Cache-read input tokens from an AI SDK usage object, across provider shapes.
 *
 * Why this exists: the OpenAI-compatible provider SDK maps cache reads ONLY
 * from `prompt_tokens_details.cached_tokens`, but some providers report a
 * native `prompt_cache_hit_tokens`. If the endpoint doesn't emit the standard
 * field, the normalised `inputTokenDetails.cacheReadTokens` is undefined and
 * settlement would record cachedInput = 0 — billing all input at miss price
 * (up to ~10x real spend) and blinding the cache-hit metric. This helper
 * checks the normalised field first, then the known raw shapes, and never
 * throws (settlement must not break on an unexpected usage payload).
 */
export function extractCachedInputTokens(usage: unknown): number {
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
  if (typeof usage !== "object" || usage === null) return 0;
  const u = usage as Record<string, unknown>;
  const normalised = num(
    (u.inputTokenDetails as Record<string, unknown> | undefined)?.cacheReadTokens,
  );
  if (normalised > 0) return normalised;
  const raw = u.raw as Record<string, unknown> | undefined;
  return (
    num(raw?.prompt_cache_hit_tokens) ||
    num((raw?.prompt_tokens_details as Record<string, unknown> | undefined)?.cached_tokens) ||
    num(u.prompt_cache_hit_tokens)
  );
}
