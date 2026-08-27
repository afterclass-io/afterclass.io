import { error, text, widget, type MCPServer } from "mcp-use/server";

import { allTools } from "@/server/mcp/tools";
import { errText, type ToolContext, type ToolResult } from "@/server/mcp/types";
import { checkAndIncrement } from "@/server/assistant/ratelimit";
import { getChatConfig, getRateLimitWindowMinutes } from "@/server/ecfg/chat";
import { buildToolContext } from "./user";

export function toMcpUseResponse(result: ToolResult) {
  const plain = result.content.find((c) => c.type === "text")?.text ?? "";
  return result.isError ? error(plain || "Tool failed") : text(plain);
}

/**
 * DB-backed write budget check for MCP write tools.
 * Returns an errText result when the user has exceeded the per-minute limit,
 * otherwise null (proceed).
 */
async function checkWriteBudget(ctx: ToolContext): Promise<ToolResult | null> {
  const chat = await getChatConfig();
  const limit = chat.mcpRateLimitPerMinute;
  const windowMinutes = getRateLimitWindowMinutes();
  const res = await checkAndIncrement(`mcp-write:${ctx.user.id}`, limit, windowMinutes);
  if (!res.ok) {
    return errText(
      `Write rate limit exceeded: at most ${limit} write operations per minute are allowed. ` +
        `Please wait ~${res.retryAfterSeconds}s before trying again.`,
    );
  }
  return null;
}

/**
 * Wrap a single catalog tool as an mcp-use handler. Resolves the caller from
 * ctx.auth (Supabase identity) per call; fail-closed when unauthenticated.
 *
 * When the tool carries widget metadata (`widgetName` + `toWidgetProps`) and
 * the run succeeded, the result is wrapped with `widget()` so the props become
 * `structuredContent` (widget-only, not added to model context) while the
 * plain text output is what the model sees.
 */
export function makeHandler(
  tool: (typeof allTools)[number],
  run: (ctx: ToolContext, args: unknown) => Promise<ToolResult>,
) {
  return async (
    args: unknown,
    mcpCtx?: {
      auth?: {
        user?: {
          userId?: string;
          email?: string;
          email_verified?: boolean;
          emailVerified?: boolean;
          email_confirmed_at?: string | null;
        };
      };
    },
  ) => {
    const ctx = await buildToolContext(mcpCtx?.auth?.user ?? {});
    if (!ctx) return error("Unauthorized");
    // DB-backed write rate limit for non-readOnly tools (wired to ecfg mcpRateLimitPerMinute).
    if (!tool.readOnly) {
      const limited = await checkWriteBudget(ctx);
      if (limited) return toMcpUseResponse(limited);
    }
    try {
      const result = await run(ctx, args);
      if (tool.widgetName && tool.toWidgetProps && !result.isError) {
        return widget({
          props: tool.toWidgetProps(result),
          output: toMcpUseResponse(result),
        });
      }
      return toMcpUseResponse(result);
    } catch {
      return error(`Internal error in tool ${tool.name}`);
    }
  };
}

export function registerMcpUseTools(server: MCPServer): void {
  for (const tool of allTools) {
    server.tool(
      {
        name: tool.name,
        description: tool.description,
        schema: tool.inputSchema,
        ...(tool.readOnly ? { annotations: { readOnlyHint: true } } : {}),
        // Link widget-backed tools to their resources/<name>/widget.tsx so the
        // Inspector / ChatGPT render the widget for `widget()` results.
        ...(tool.widgetName ? { widget: { name: tool.widgetName } } : {}),
      },
      makeHandler(tool, (ctx, args) => tool.run(ctx, args as never)),
    );
  }
}
