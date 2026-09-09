import type { ChatConfig as LegacyChatConfig } from "./config";
import {
  getChatConfigAsync as getCanonicalChatConfig,
  getChatWriteRateLimit as getCanonicalChatWriteRateLimit,
  getRateLimitWindowMinutes as getCanonicalRateLimitWindowMinutes,
} from "@/server/config/chat-config";

/**
 * Server-side chat config: live Edge Config with local JSON fallback.
 *
 * Task 8: this module is now a thin delegation shim over the canonical
 * `src/server/config/chat-config.ts`. Precedence (env > EdgeConfig >
 * config.json > defaults) and fail-closed range checks live there; the raw
 * `process.env` reads that used to live here (fail-open `Number(env)` that
 * swallowed NaN/0/negatives) are gone. The async signature is preserved so
 * the ~15 existing call sites (quota.ts, status.ts, rate-limit.ts,
 * route.ts, trim.ts, view-tools, tests) keep working unchanged.
 *
 * The legacy `ChatConfig` shape (camelCase ecfg keys incl.
 * `spendCapPerMonthUsd`, `maxInputTokens`, `maxOutputTokens`,
 * `maxToolRounds`) is a SUBSET of the canonical config: quota/rate/spend/
 * token fields map 1:1, and the canonical extra fields (bid floors, spike
 * tokens, retention windows, llm, timezone, duration) ride along
 * harmlessly. `getChatWriteRateLimit(chat)` keeps its C2 precedence
 * (env-override-then-fallback) — see the budget matrix in
 * `src/mcp/rate-limit.ts`, which still describes the three buckets.
 */
export async function getChatConfig(): Promise<LegacyChatConfig> {
  const canonical = await getCanonicalChatConfig();
  return {
    quotaPerMonth: canonical.quotaPerMonth,
    nudgeAt: canonical.nudgeAt,
    rateLimitPerMinute: canonical.rateLimitPerMinute,
    mcpRateLimitPerMinute: canonical.mcpRateLimitPerMinute,
    spendCapPerMonthUsd: canonical.spendCapPerMonthUsd,
    maxInputTokens: canonical.maxInputTokens,
    maxOutputTokens: canonical.maxOutputTokens,
    maxToolRounds: canonical.maxToolRounds,
    // Task 4 kill-switches ride the same legacy-shape return so the MCP
    // transport and tests read flags through this shim.
    chatEnabled: canonical.chatEnabled,
    widgetEnabled: canonical.widgetEnabled,
    mcpEnabled: canonical.mcpEnabled,
    priceInputPerM: 0.14,
    priceCachedInputPerM: 0.014,
    priceOutputPerM: 0.28,
  };
}

/** Effective per-minute limit for chat write-tool executions (chat-write: budget).
 * Accepts the canonical write limit when the caller resolved it (Edge/file
 * honored); otherwise falls back to the env read inside the canonical helper. */
export function getChatWriteRateLimit(chat: {
  rateLimitPerMinute: number;
  writeRateLimitPerMinute?: number;
}): number {
  return getCanonicalChatWriteRateLimit(chat);
}

/** Effective fixed-window size in minutes for rate limiting.
 * Accepts the canonical window when the caller resolved it (Edge/file
 * honored); otherwise falls back to the env read inside the canonical helper. */
export function getRateLimitWindowMinutes(canonical?: {
  rateLimitWindowMinutes?: number;
}): number {
  return getCanonicalRateLimitWindowMinutes(canonical);
}
