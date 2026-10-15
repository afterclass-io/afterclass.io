/**
 * Budget matrix (documentation only — the numbers live with the transports).
 *
 * Chat-write effective limit:
 * env-override-then-fallback — `getChatWriteRateLimit(chat)` returns
 * `CHAT_WRITE_RATE_LIMIT_PER_MINUTE` when set (fail-closed: throws on
 * non-positive/non-finite instead of silently 429ing), else
 * `chat.rateLimitPerMinute`. The matrix below matches the implementation.
 *
 * Three per-user buckets, keyed `<prefix>:<userId>` in the shared
 * `checkAndIncrement` store (`src/server/assistant/ratelimit.ts`), all with
 * the same fixed window (`getRateLimitWindowMinutes()`, default 1 minute):
 *
 * | Bucket        | Owner (who charges it)                              | Limit source                                  |
 * |---------------|-------------------------------------------------------|-----------------------------------------------|
 * | `mcp-read:`   | MCP transport (`src/mcp/register.ts`, viewless reads; view-bound adapters) via `dispatchToolCall` with `budget: "read"` | `chat.mcpRateLimitPerMinute` (`getChatConfig`) |
 * | `mcp-write:`  | MCP transport (viewless writes) via `dispatchToolCall` with `budget: "write"` + default prefixes | same `chat.mcpRateLimitPerMinute` ceiling, separate bucket |
 * | `chat-write:` | Chat transport (`src/server/assistant/tools.ts` via the dispatch policy formatter + limit, NOT via the MCP prefixes) | `getChatWriteRateLimit(chat)` (env `CHAT_WRITE_RATE_LIMIT_PER_MINUTE`, falls back to `chat.rateLimitPerMinute`) |
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
 * the chat path's dispatch policy), so an agent "testing all tools"
 * cannot wipe data unconfirmed.
 *
 * Two-tier gate (confirm ONLY destructive +
 * high-impact): the old confirm-all-writes 22-name set is split into Tier 1
 * (11 confirm-required names below) and Tier 2 (11 constructive writes in
 * `constructiveTools`, budget-only, NEVER confirm-gated). Loop-equivalence
 * note (why this is safe enough): single-write loops CAN replicate bulk
 * effects, but every constructive call still draws from the
 * `mcp-write:`/`chat-write:` fixed-window budget (default 60/10 per minute),
 * so a runaway loop is throttled within one window; bulk wipes stay behind
 * the confirm wall. Revisit if abuse review shows budget-only creates being
 * spammed.
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
  "remove-meeting-poll",
  "save-roadmap-entries", // full-replace: entries:[] wipes the roadmap
  "save-bids", // bulk overwrite of bid state
  "set-bid-status", // flips financial status
  // Financial/sharing impact: a budget rewrite changes spendable e-credits;
  // a visibility flip publishes (or hides) user data.
  "set-bid-budget",
  "set-timetable-visibility",
  "set-roadmap-visibility",
  "get-timetable-calendar-link", // escalates PRIVATE → UNLISTED on opt-in
]);
// Tier 2 — budget-only (constructive writes; throttled by mcp-write:/
// chat-write: buckets, never confirm-gated):
export const constructiveTools = new Set([
  "upsert-bid",
  "create-timetable",
  "rename-timetable",
  "add-class-to-timetable",
  "create-roadmap",
  "rename-roadmap",
  "upsert-roadmap-entry", // additive, but repeated calls rewrite placement
  "set-matric-term", // rewrites seniority basis for the whole roadmap
  "set-active-roadmap", // flips the singleton active roadmap
  "sync-roadmap-progress", // bulk-adds courses across all terms
  "copy-public-roadmap", // additive copy into own account — deletes nothing
  "create-meeting-poll",
  "submit-meeting-availability",
]);

/**
 * Confirm gate for destructive tools. Returns null when the call may proceed
 * (tool not in Tier 1, or `confirm:true` present, or a valid single-use
 * `confirmToken`), or an error message when a Tier-1 tool was called without
 * explicit confirmation.
 *
 * Token form: when `params.confirmToken` carries a string and
 * `opts.verify` is provided, the gate verifies the HMAC token binding
 * user + tool + argHash before falling back to the legacy `confirm:true`
 * boolean. Model-attested confirm:true still authorizes Tier-1 tools until
 * the Approve/Reject card UI ships; token verification is available alongside.
 */
export async function checkDestructiveConfirm(
  toolName: string,
  params: unknown,
  opts?: {
    userId?: string;
    verify?: (
      token: string,
      parts: { userId: string; tool: string; argHash: string },
    ) => Promise<boolean>;
  },
): Promise<string | null>;
export function checkDestructiveConfirm(
  toolName: string,
  params: unknown,
): string | null;
export function checkDestructiveConfirm(
  toolName: string,
  params: unknown,
  opts?: {
    userId?: string;
    verify?: (
      token: string,
      parts: { userId: string; tool: string; argHash: string },
    ) => Promise<boolean>;
  },
): string | null | Promise<string | null> {
  if (!destructiveTools.has(toolName)) return null;
  if (
    params !== null &&
    typeof params === "object" &&
    (params as Record<string, unknown>).confirm === true
  ) {
    return null;
  }
  const token =
    params !== null && typeof params === "object"
      ? (params as Record<string, unknown>).confirmToken
      : undefined;
  if (typeof token === "string" && opts?.verify && opts?.userId) {
    const { confirmToken: _dropped, ...boundArgs } = params as Record<
      string,
      unknown
    >;
    void _dropped;
    return (async () => {
      const { hashConfirmArgs } = await import("@/server/mcp/confirm-token");
      const ok = await opts.verify!(token, {
        userId: opts.userId!,
        tool: toolName,
        argHash: hashConfirmArgs(boundArgs),
      });
      return ok ? null : confirmRejection(toolName);
    })();
  }
  return confirmRejection(toolName);
}

function confirmRejection(toolName: string): string {
  return (
    `Tool "${toolName}" changes or publishes your data and requires explicit confirmation: ` +
    `call again with confirm:true after showing the user exactly what will change and getting explicit approval.`
  );
}
