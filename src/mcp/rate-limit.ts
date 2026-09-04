import { checkAndIncrement } from "@/server/assistant/ratelimit";
import { getChatConfig, getRateLimitWindowMinutes } from "@/server/ecfg/chat";
import type { ToolContext } from "@/server/mcp/types";

/**
 * Tools that permanently delete user data. A call to one of these must carry
 * an explicit `confirm:true` param (checked in `register.ts` before the tool
 * runs), so an agent "testing all tools" cannot wipe data unconfirmed.
 * Constructive writes (create/upsert/rename) are intentionally NOT gated.
 */
export const destructiveTools = new Set([
  "remove-timetable",
  "remove-class-from-timetable",
  "remove-bid",
  "remove-roadmap",
]);

/**
 * Confirm gate for destructive tools. Returns null when the call may proceed
 * (non-destructive tool, or `confirm:true` present), or an error message when
 * a destructive tool was called without explicit confirmation.
 */
export function checkDestructiveConfirm(toolName: string, params: unknown): string | null {
  if (!destructiveTools.has(toolName)) return null;
  if (
    params !== null &&
    typeof params === "object" &&
    (params as Record<string, unknown>).confirm === true
  ) {
    return null;
  }
  return (
    `Destructive tool "${toolName}" requires explicit confirmation: ` +
    `call again with confirm:true after showing the user what will be deleted.`
  );
}

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
