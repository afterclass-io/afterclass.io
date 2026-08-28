import { errText, type McpTool, type ToolContext, type ToolResult } from "./types";

/**
 * In-memory write rate limiter for the MCP write path.
 *
 * v1 uses a fixed 60-second window bucketed by wall-clock time, stored in a
 * process-local `Map` keyed by user id. It is deliberately dependency-free and
 * simple, but it is an approximation: it is per-process (not shared across
 * server instances) and resets on restart. Production should replace this with
 * a DB/Redis-backed counter — the ecfg `mcpRateLimitPerMinute` value is
 * reserved for exactly this MCP endpoint and is the natural successor.
 *
 * Windows are aligned to the wall clock (`Math.floor(now / 60_000) * 60_000`),
 * so a bucket auto-resets when the minute rolls over; stale buckets are simply
 * replaced on the next call (no timers, no pruning needed for v1).
 */

/** Length of one budget window, in ms. */
export const WRITE_RATE_LIMIT_WINDOW_MS = 60_000;

export interface WriteRateLimitOptions {
  /** Max calls allowed per user per 60s window. */
  perMinute: number;
  /** Injectable clock (ms epoch) for tests; defaults to `Date.now`. */
  now?: () => number;
}

export interface RateLimitDecision {
  ok: boolean;
  /** Remaining calls in the current window (0 when rejected). */
  remaining: number;
  /** ms until the window resets (0 when allowed). */
  retryAfterMs: number;
}

export interface WriteRateLimiter {
  /** Reserve one write call for `userKey`; returns the decision. */
  check(userKey: string): RateLimitDecision;
  /** Clear state for one user, or for all users when `userKey` is omitted. */
  reset(userKey?: string): void;
}

interface Bucket {
  windowStart: number;
  count: number;
}

export function createWriteRateLimiter(options: WriteRateLimitOptions): WriteRateLimiter {
  const { perMinute } = options;
  const now = options.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  return {
    check(userKey) {
      const t = now();
      const windowStart = Math.floor(t / WRITE_RATE_LIMIT_WINDOW_MS) * WRITE_RATE_LIMIT_WINDOW_MS;
      let bucket = buckets.get(userKey);
      if (!bucket || bucket.windowStart !== windowStart) {
        // First call this window (or a stale bucket from a previous window).
        bucket = { windowStart, count: 0 };
        buckets.set(userKey, bucket);
      }
      if (bucket.count >= perMinute) {
        return {
          ok: false,
          remaining: 0,
          retryAfterMs: Math.max(1, windowStart + WRITE_RATE_LIMIT_WINDOW_MS - t),
        };
      }
      bucket.count += 1;
      return { ok: true, remaining: perMinute - bucket.count, retryAfterMs: 0 };
    },
    reset(userKey) {
      if (userKey) buckets.delete(userKey);
      else buckets.clear();
    },
  };
}

export interface WithWriteRateLimitOptions {
  /** Max write calls per user per minute. */
  perMinute: number;
  /**
   * Shared limiter instance. When omitted, a fresh per-tool limiter is created
   * (each wrapped tool then has its own per-user budget). Pass one shared
   * limiter to enforce a single global write budget across all wrapped tools —
   * `src/mcp/register.ts` does exactly that.
   */
  limiter?: WriteRateLimiter;
  /** Optional clock override, forwarded to a limiter created here. */
  now?: () => number;
  /** Key the budget per caller; defaults to `ctx.user.id`. */
  getUserKey?: (ctx: ToolContext) => string;
}

/**
 * Wrap a tool so its `run` first consumes the caller's write budget. On
 * rejection, returns a friendly `errText` WITHOUT invoking the underlying
 * tool. Read-only tools should NOT be wrapped — they have no write budget and
 * must stay unaffected by the limiter.
 */
export function withWriteRateLimit(
  tool: McpTool,
  options: WithWriteRateLimitOptions,
): McpTool {
  const limiter =
    options.limiter ?? createWriteRateLimiter({ perMinute: options.perMinute, now: options.now });
  const getUserKey = options.getUserKey ?? ((ctx: ToolContext) => ctx.user.id);
  const { perMinute } = options;

  return {
    ...tool,
    run: async (ctx: ToolContext, input: unknown): Promise<ToolResult> => {
      const decision = limiter.check(getUserKey(ctx));
      if (!decision.ok) {
        const retrySeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
        return errText(
          `Write rate limit exceeded: at most ${perMinute} write operations per minute are allowed. ` +
            `Please wait ~${retrySeconds}s before trying again.`,
        );
      }
      return tool.run(ctx, input);
    },
  };
}
