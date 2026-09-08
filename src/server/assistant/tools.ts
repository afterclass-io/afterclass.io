import { tool, type ToolSet } from "ai";

import { dispatchToolCall } from "@/mcp/dispatch";
import { allTools } from "@/server/mcp/tools";
import type { ToolContext } from "@/server/mcp/types";
import { getToolOutputBudget } from "@/server/config/chat-config";

/** ~6k tokens at the chars/4 heuristic. Caps the per-call miss region AND the
 * within-loop amplification (a result is re-sent at miss in every remaining
 * agent-loop step of the same turn). Canonical value lives in
 * `src/server/config/chat-config.ts` (`maxToolResultChars`), read through
 * the getter (Task 13). Kept exported (module-scope getter calls) so
 * existing imports keep working. */
export const MAX_TOOL_RESULT_CHARS: number = getToolOutputBudget().maxChars;

export const TRUNCATION_NOTE: string = getToolOutputBudget().note;

/**
 * Convert the shared MCP skill catalog into AI SDK tools for the chat route.
 *
 * Single shared pipeline: each execution delegates to `dispatchToolCall`
 * (`src/mcp/dispatch.ts`) — the single owner of the confirm gate AND the
 * budget charge. No pre-checks live here: dispatch checks `confirm:true`
 * for Tier-1 (destructive/high-impact) tools before charging the caller's
 * per-user write budget (`chat-write:<userId>`, DB-backed fixed window via
 * `checkBudget`, limit = effective write limit) and before running the
 * tool, so rejected calls are never charged and never reach the procedure.
 * On exhaustion dispatch returns the friendly "slow down" text below instead
 * of running — the model relays it and the stream is not broken by a throw.
 * Read-only tools pass `budget: "none"` and run untouched. (The MCP path
 * has its own limiter in `src/mcp/dispatch.ts` with `mcp-write:`/`mcp-read:`
 * prefixes — same single owner, separate buckets — see the budget matrix in
 * `src/mcp/rate-limit.ts` for the three buckets and why.)
 */
export function buildAssistantTools(
  ctx: ToolContext,
  writeRateLimitPerMinute: number,
  windowMinutes = 1,
): ToolSet {
  const tools: ToolSet = {};
  for (const t of allTools) {
    tools[t.name] = tool({
      description: t.description,
      inputSchema: t.inputSchema,
      execute: async (args) => {
        // Single dispatch (auth + confirm-gate + budget + run + shape, no
        // dev bypass — chat always requires a signed-in user). The caller's
        // ToolContext is passed straight through (dispatch accepts it as-is
        // — no DB re-resolve, no ctx-shape mocking needed in tests).
        // `confirm: true` arms the Tier-1 gate for destructive/high-impact
        // writes (constructive Tier-2 writes are budget-only); the budget
        // prefix + effective write limit + first-person slow-down
        // formatter below are this path's policy contribution.
        // `t.run` throws propagate verbatim via
        // `throwBehavior: "propagate"`.
        const out = await dispatchToolCall({
          tool: t as never,
          params: args,
          ctx,
          policy: {
            confirm: true,
            budget: t.readOnly ? "none" : "write",
            budgetPrefix: "chat-write",
            limit: writeRateLimitPerMinute,
            windowMs: windowMinutes * 60_000,
            shape: "text",
            truncateAt: MAX_TOOL_RESULT_CHARS,
            truncationNote: TRUNCATION_NOTE,
            devBypass: false,
            throwBehavior: "propagate",
            // Token pass-through (Task 9): the model forwards a confirmToken
            // issued out-of-band (Approve card follow-up); the gate binds it
            // to user + tool + args. Secret mirrors supabase-access-token.ts
            // (NEXTAUTH_SECRET, falling back to AUTH_SECRET).
            confirmSecret:
              process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
            onBudgetExceeded: ({ limit, retry }) =>
              `You're making changes too quickly - at most ${limit} write actions per minute are allowed. Please wait ~${retry}s and ask me to try again.`,
          },
        });
        // The chat path surfaces pipeline rejections as plain model-relayed
        // text (no error envelope). Catalog isError results throw to break
        // the stream; thrown runs propagate natively via dispatch — exactly
        // as before.
        if ("error" in out) return out.error;
        if (out.isError)
          throw new Error(out.content[0]?.text || `${t.name} failed`);
        return out.content[0]?.text ?? "";
      },
    });
  }
  return tools;
}
