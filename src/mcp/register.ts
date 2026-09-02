import type { MCPServer } from "mcp-use";
import type { RequestContext } from "mcp-use";
import type { SupabaseOAuthUser } from "mcp-use/oauth/supabase";

import { allTools } from "@/server/mcp/tools";
import type { ToolContext } from "@/server/mcp/types";
import { buildToolContext } from "./user";
import { errorResult, textResult } from "./view-tools/results";
import { checkWriteBudget } from "./rate-limit";

// The 7 view-bound tool names are registered by view-tools/* (module scope, exported ToolRefs);
// this loop skips them and registers the remaining 42 as generic CallToolResult:
export const viewBoundNames = new Set([
  "search-courses",
  "recommend-bid-amount",
  "get-timetable-calendar-link",
  "my-bid-plan",
  "get-my-roadmap",
  "get-course-reviews",
  "explore-bid-options",
]);

export function registerViewlessTools(server: MCPServer): void {
  for (const tool of allTools) {
    if (viewBoundNames.has(tool.name)) continue;
    server.tool(
      {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as never,
        ...(tool.readOnly ? { annotations: { readOnlyHint: true } } : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mcp-use context generic varies across Hono versions; params-first signature is what matters
      async (params: unknown, ctx: any) => {
        const toolCtx = await buildToolContext(ctx as never);
        if (!toolCtx) return errorResult("Unauthorized");
        if (!tool.readOnly) {
          const limited = await checkWriteBudget(toolCtx);
          if (limited) return errorResult(limited);
        }
        try {
          const result = await tool.run(toolCtx, params as never);
          if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
          const text = result.content[0]?.text ?? "";
          return textResult(text);
        } catch {
          return errorResult(`Internal error in tool ${tool.name}`);
        }
      },
    );
  }
}

// Back-compat alias for earlier tests that import registerMcpUseTools
export const registerMcpUseTools = registerViewlessTools;

// Helpers kept for test import compatibility
export function toMcpUseResponse(result: { content: Array<{ type: "text"; text: string }>; isError?: boolean }) {
  return result.isError ? errorResult(result.content[0]?.text ?? "Tool failed") : textResult(result.content[0]?.text ?? "");
}

export function makeHandler(
  tool: (typeof allTools)[number],
  run: (ctx: ToolContext, args: unknown) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean; widgetProps?: Record<string, unknown> }>,
) {
  return async (
    args: unknown,
    mcpCtx?: { auth?: { user?: SupabaseOAuthUser } | unknown } | RequestContext<SupabaseOAuthUser, true>,
  ) => {
    const ctx = await buildToolContext(mcpCtx as never);
    if (!ctx) return errorResult("Unauthorized");
    if (!tool.readOnly) {
      const limited = await checkWriteBudget(ctx);
      if (limited) return errorResult(limited);
    }
    try {
      const result = await run(ctx, args);
      if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
      // Preserve widgetProps unwrapping for legacy handlers that expect it via helper — but return raw now
      // For compat with old tests that asserted widget(), we return raw content; widget path is now handled in view-tools
      const text = result.content[0]?.text ?? "";
      return textResult(text);
    } catch {
      return errorResult(`Internal error in tool ${tool.name}`);
    }
  };
}
