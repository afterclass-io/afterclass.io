import type { MCPServer } from "mcp-use";

import { allTools } from "@/server/mcp/tools";
import { buildToolContext } from "./user";
import { asSchema } from "./schema";
import { errorResult, textResult } from "./view-tools/results";
import { checkWriteBudget } from "./rate-limit";

// The 7 view-bound tool names are registered by view-tools/* (module scope, exported ToolRefs);
// this loop skips them and registers the remaining 43 as generic CallToolResult:
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
        inputSchema: asSchema(tool.inputSchema),
        ...(tool.readOnly ? { annotations: { readOnlyHint: true } } : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mcp-use context generic varies across Hono versions; params-first signature is what matters
      async (params: unknown, ctx: any) => {
        const toolCtx = await buildToolContext(ctx as never);
        if (!toolCtx)
          return errorResult(
            "Unauthorized: no verified identity and dev bypass is off. For local Inspector use `bun run mcp:dev` with MCP_DEV_BYPASS=true (see MCP.md).",
          );
        if (!tool.readOnly) {
          const limited = await checkWriteBudget(toolCtx);
          if (limited) return errorResult(limited);
        }
        try {
          const result = await tool.run(toolCtx, params);
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
