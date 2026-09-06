import { tool, type ToolSet } from "ai";

import { dispatchToolCall } from "@/mcp/dispatch";
import { checkDestructiveConfirm } from "@/mcp/rate-limit";
import { allTools } from "@/server/mcp/tools";
import type { ToolContext } from "@/server/mcp/types";
import { checkAndIncrement } from "@/server/assistant/ratelimit";

/** ~6k tokens at the chars/4 heuristic. Caps the per-call miss region AND the
 * within-loop amplification (a result is re-sent at miss in every remaining
 * agent-loop step of the same turn). */
export const MAX_TOOL_RESULT_CHARS = 24_000;

export const TRUNCATION_NOTE =
  "\n[truncated - result too large; refine your query or request fewer items]";

/**
 * Convert the shared MCP skill catalog into AI SDK tools for the chat route.
 *
 * Single shared pipeline: each execution delegates to `dispatchToolCall`
 * (`src/mcp/dispatch.ts`) with a policy preserving this path's historical
 * semantics. Write-path hardening: every non-readOnly tool execution first
 * consumes the caller's per-user write budget (`chat-write:<userId>`,
 * DB-backed fixed window via `checkAndIncrement`, limit = effective write
 * limit). On exhaustion the tool returns a friendly "slow down" result instead
 * of running - the model relays it and the stream is not broken by a throw.
 * Read-only tools have no budget and pass through untouched. (The MCP path
 * has its own limiter in `src/mcp/register.ts`; this one is separate and
 * does not share its budget — see the budget matrix in
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
        // Historical order, preserved exactly: destructive/full-replace
        // writes need explicit confirm:true (checked before the write budget
        // so rejected calls are not charged), then the write-budget charge,
        // then a single dispatch (auth + run + shape, no dev bypass — chat
        // always requires a signed-in user). The caller's ToolContext is
        // passed straight through (dispatch accepts it as-is — no DB
        // re-resolve, no ctx-shape mocking needed in tests). On budget
        // exhaustion return the slow-down text directly WITHOUT calling
        // dispatch at all; `t.run` throws propagate verbatim via
        // `throwBehavior: "propagate"`.
        const gate = checkDestructiveConfirm(t.name, args);
        if (gate) return gate;
        if (!t.readOnly) {
          const { ok, retryAfterSeconds } = await checkAndIncrement(
            `chat-write:${ctx.user.id}`,
            writeRateLimitPerMinute,
            windowMinutes,
          );
          if (!ok) {
            return (
              `You're making changes too quickly - at most ${writeRateLimitPerMinute} ` +
              `write actions per minute are allowed. Please wait ~${retryAfterSeconds}s ` +
              `and ask me to try again.`
            );
          }
        }
        const out = await dispatchToolCall({
          tool: t as never,
          params: args,
          ctx,
          policy: {
            confirm: false,
            budget: "none",
            shape: "text",
            truncateAt: MAX_TOOL_RESULT_CHARS,
            truncationNote: TRUNCATION_NOTE,
            devBypass: false,
            throwBehavior: "propagate",
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
