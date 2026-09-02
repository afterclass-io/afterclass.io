import { tool, type ToolSet } from "ai";

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
 * Write-path hardening: every non-readOnly tool execution first consumes the
 * caller's per-user write budget (`chat-write:<userId>`, DB-backed fixed
 * window via `checkAndIncrement`, limit = effective write limit). On
 * exhaustion the tool returns a friendly "slow down" result instead of
 * running - the model relays it and the stream is not broken by a throw.
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
        const result = await t.run(ctx, args);
        const text = result.content.find((c) => c.type === "text")?.text ?? "";
        if (result.isError) throw new Error(text || `${t.name} failed`);
        return text.length > MAX_TOOL_RESULT_CHARS
          ? text.slice(0, MAX_TOOL_RESULT_CHARS) + TRUNCATION_NOTE
          : text;
      },
    });
  }
  return tools;
}
