import { checkAndIncrement } from "@/server/assistant/ratelimit";
import { getChatConfig, getRateLimitWindowMinutes } from "@/server/ecfg/chat";
import type { ToolContext } from "@/server/mcp/types";

/**
 * Shared write-budget guard for MCP tools.
 * Returns null when within budget, or an error message when rate-limited.
 * Each tool call must invoke this exactly once (do not double-charge).
 */
export async function checkWriteBudget(ctx: ToolContext): Promise<string | null> {
  const chat = await getChatConfig();
  const limit = chat.mcpRateLimitPerMinute;
  const windowMinutes = getRateLimitWindowMinutes();
  const res = await checkAndIncrement(`mcp-write:${ctx.user.id}`, limit, windowMinutes);
  if (!res.ok) {
    return `Write rate limit exceeded: at most ${limit} write operations per minute are allowed. Please wait ~${res.retryAfterSeconds}s before trying again.`;
  }
  return null;
}
