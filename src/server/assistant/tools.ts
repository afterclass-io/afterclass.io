import { tool, type ToolSet } from "ai";

import { dispatchToolCall } from "@/mcp/dispatch";
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
 * does not share its budget.)
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
        // Single shared pipeline via dispatchToolCall. Policy preserves this
        // path's historical semantics exactly: the caller's ToolContext is
        // passed straight through (dispatch accepts it as-is — no
        // DB re-resolve, no ctx-shape mocking needed in tests);
        // destructive/full-replace writes need explicit confirm:true (checked
        // before the write budget so rejected calls are not charged; no dev
        // bypass — chat always requires a signed-in user); writes draw from
        // the caller's per-user `chat-write:<userId>` bucket via the explicit
        // limit args (not ecfg); oversized results are clamped.
        // Dispatch's own budget step stays off (`budget: "none"`); the write
        // charge below is exactly-once with the historical key/limit source.
        const out = await dispatchToolCall({
          tool: {
            name: t.name,
            readOnly: t.readOnly,
            run: async (c, input) => {
              if (!t.readOnly) {
                const { ok, retryAfterSeconds } = await checkAndIncrement(
                  `chat-write:${c.user.id}`,
                  writeRateLimitPerMinute,
                  windowMinutes,
                );
                if (!ok) {
                  return {
                    content: [
                      {
                        type: "text",
                        text:
                          `You're making changes too quickly - at most ${writeRateLimitPerMinute} ` +
                          `write actions per minute are allowed. Please wait ~${retryAfterSeconds}s ` +
                          `and ask me to try again.`,
                      },
                    ],
                    // Marker so the dispatch-result mapping below relays the
                    // slow-down as plain model text instead of throwing.
                    widgetProps: { __chatSlowDown: true },
                  };
                }
              }
              return t.run(c, input);
            },
          },
          params: args,
          ctx,
          policy: {
            confirm: !t.readOnly,
            budget: "none",
            shape: "text",
            truncateAt: MAX_TOOL_RESULT_CHARS,
            truncationNote: TRUNCATION_NOTE,
            devBypass: false,
          },
        });
        // The chat path surfaces pipeline rejections as plain model-relayed
        // text (no error envelope) — except thrown runs and catalog isError
        // results, which throw to break the stream exactly as before.
        if ("error" in out) {
          if (out.error.startsWith("Internal error in tool "))
            throw new Error(
              out.error.replace(
                `Internal error in tool ${t.name}`,
                `${t.name} failed`,
              ),
            );
          return out.error;
        }
        if (out.isError) {
          if (
            out.structuredContent &&
            typeof out.structuredContent === "object" &&
            (out.structuredContent as { __chatSlowDown?: unknown })
              .__chatSlowDown === true
          )
            return out.content[0]?.text ?? "";
          throw new Error(out.content[0]?.text || `${t.name} failed`);
        }
        return out.content[0]?.text ?? "";
      },
    });
  }
  return tools;
}
