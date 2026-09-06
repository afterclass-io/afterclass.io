import { checkAndIncrement } from "@/server/assistant/ratelimit";
import { getChatConfig, getRateLimitWindowMinutes } from "@/server/ecfg/chat";
import type { ToolContext } from "@/server/mcp/types";

/**
 * Budget matrix (Task 5 — documentation only, no limit changes; Task 7/8 own
 * the numbers).
 *
 * Three per-user buckets, keyed `<prefix>:<userId>` in the shared
 * `checkAndIncrement` store (`src/server/assistant/ratelimit.ts`), all with
 * the same fixed window (`getRateLimitWindowMinutes()`, default 1 minute):
 *
 * | Bucket        | Owner (who charges it)                              | Limit source                                  |
 * |---------------|-------------------------------------------------------|-----------------------------------------------|
 * | `mcp-read:`   | MCP transport (`src/mcp/register.ts`, viewless reads; view-bound adapters) via `checkReadBudget` below | `chat.mcpRateLimitPerMinute` (`getChatConfig`) |
 * | `mcp-write:`  | MCP transport (viewless writes) via `checkWriteBudget` below; `dispatchToolCall` with `budget: "read"|"write"` + default prefixes | same `chat.mcpRateLimitPerMinute` ceiling, separate bucket |
 * | `chat-write:` | Chat transport (`src/server/assistant/tools.ts` `buildAssistantTools`, inline `checkAndIncrement` — NOT via the helpers below) | `getChatWriteRateLimit(chat)` (env `CHAT_WRITE_RATE_LIMIT_PER_MINUTE`, falls back to `chat.rateLimitPerMinute`) |
 *
 * Why they don't share: reads are legitimately higher-volume than writes, so
 * `mcp-read:` and `mcp-write:` share the configured ceiling but draw from
 * separate buckets (a read burst can never starve writes and vice versa);
 * `chat-write:` lives on the chat path's own effective limit so in-app agent
 * loops and external MCP hosts cannot consume each other's budget.
 *
 * Tools that permanently delete user data — plus full-replace writes that can
 * wipe state just as thoroughly (an empty payload overwrites instead of
 * deleting row-by-row). A call to one of these must carry an explicit
 * `confirm:true` param (checked in `register.ts` before the tool runs, and in
 * the chat path's `buildAssistantTools`), so an agent "testing all tools"
 * cannot wipe data unconfirmed. Constructive writes (create/upsert/rename)
 * are intentionally NOT gated.
 *
 * `confirm` must also be declared as an optional field in each gated tool's
 * zod inputSchema: both dispatch layers validate args against the schema
 * before the handler runs, and unknown keys (like an undeclared `confirm`)
 * are stripped — without the declaration, even a confirmed call could never
 * satisfy the gate.
 */
export const destructiveTools = new Set([
  "remove-timetable",
  "remove-class-from-timetable",
  "remove-bid",
  "remove-roadmap",
  "save-roadmap-entries", // full-replace: entries:[] wipes the roadmap
  "save-bids", // bulk overwrite of bid state
  "set-bid-status", // flips financial status
  // Financial/sharing impact: a budget rewrite changes spendable e-credits;
  // a visibility flip publishes (or hides) user data.
  "set-bid-budget",
  "set-timetable-visibility",
  "set-roadmap-visibility",
]);

/**
 * Confirm gate for destructive tools. Returns null when the call may proceed
 * (non-destructive tool, or `confirm:true` present), or an error message when
 * a destructive tool was called without explicit confirmation.
 */
export function checkDestructiveConfirm(
  toolName: string,
  params: unknown,
): string | null {
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
export async function checkWriteBudget(
  ctx: ToolContext,
  keyPrefix = "mcp-write",
): Promise<string | null> {
  const chat = await getChatConfig();
  const limit = chat.mcpRateLimitPerMinute;
  const windowMinutes = getRateLimitWindowMinutes();
  const res = await checkAndIncrement(
    `${keyPrefix}:${ctx.user.id}`,
    limit,
    windowMinutes,
  );
  if (!res.ok) {
    return `Write rate limit exceeded: at most ${limit} write operations per minute are allowed. Please wait ~${res.retryAfterSeconds}s before trying again.`;
  }
  return null;
}

/**
 * Shared read-budget guard for readOnly MCP tools (share-token spray
 * mitigation: unauthenticated-adjacent token-guessing calls against
 * get-shared-timetable etc. are throttled per user).
 *
 * Reuses `mcpRateLimitPerMinute` with the separate `mcp-read:` key prefix —
 * reads share the configured ceiling but draw from their own bucket, so a
 * burst of reads can never starve writes (and vice versa). Read volume is
 * legitimately higher than write volume, so sharing the write ceiling here is
 * the conservative choice (a dedicated higher read limit can be split out in
 * ecfg later if reads hit the ceiling in normal use).
 */
export async function checkReadBudget(
  ctx: ToolContext,
  keyPrefix = "mcp-read",
): Promise<string | null> {
  const chat = await getChatConfig();
  const limit = chat.mcpRateLimitPerMinute;
  const windowMinutes = getRateLimitWindowMinutes();
  const res = await checkAndIncrement(
    `${keyPrefix}:${ctx.user.id}`,
    limit,
    windowMinutes,
  );
  if (!res.ok) {
    return `Read rate limit exceeded: at most ${limit} read operations per minute are allowed. Please wait ~${res.retryAfterSeconds}s before trying again.`;
  }
  return null;
}
