import type { ChatConfig as LegacyChatConfig } from "./config";
import {
  getChatConfigAsync as getCanonicalChatConfig,
  getChatWriteRateLimit as getCanonicalChatWriteRateLimit,
  getRateLimitWindowMinutes as getCanonicalRateLimitWindowMinutes,
} from "@/server/config/chat-config";

/**
 * Server-side chat config: live Edge Config with local JSON fallback.
 *
 * Thin delegation shim over the canonical
 * `src/server/config/chat-config.ts`. Precedence (env > EdgeConfig >
 * config.json > defaults) and fail-closed range checks live there. The async
 * signature is preserved so existing call sites keep working unchanged.
 *
 * The legacy `ChatConfig` shape (camelCase ecfg keys incl.
 * `maxInputTokens`, `maxOutputTokens`, `maxToolRounds`) is a SUBSET of the
 * canonical config: quota/rate/token fields map 1:1, and the canonical extra
 * fields (bid floors, spike tokens, retention windows, llm, timezone,
 * duration) ride along harmlessly. `getChatWriteRateLimit(chat)` keeps its
 * env-override-then-fallback precedence — see the budget matrix in
 * `src/mcp/rate-limit.ts`, which still describes the three buckets.
 */
export async function getChatConfig(): Promise<LegacyChatConfig> {
  const canonical = await getCanonicalChatConfig();
  return {
    quotaPerMonth: canonical.quotaPerMonth,
    nudgeAt: canonical.nudgeAt,
    rateLimitPerMinute: canonical.rateLimitPerMinute,
    mcpRateLimitPerMinute: canonical.mcpRateLimitPerMinute,
    maxInputTokens: canonical.maxInputTokens,
    maxOutputTokens: canonical.maxOutputTokens,
    maxToolRounds: canonical.maxToolRounds,
    // Kill-switches ride the same legacy-shape return so the MCP
    // transport and tests read flags through this shim.
    chatEnabled: canonical.chatEnabled,
    widgetEnabled: canonical.widgetEnabled,
    mcpEnabled: canonical.mcpEnabled,
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
