import type { MCPServer } from "mcp-use";

import { allTools } from "@/server/mcp/tools";
import { asSchema } from "./schema";
import { dispatchToolCall } from "./dispatch";

// The 7 view-bound tool names are registered by view-tools/* (module scope, exported ToolRefs);
// this loop skips them and registers the remaining 43 as generic CallToolResult:
// (recommend-bid-amount is viewless — its view was removed — so it registers here.)
export const viewBoundNames = new Set([
  "search-courses",
  "get-timetable-calendar-link",
  "my-bid-plan",
  "get-my-roadmap",
  "get-course-reviews",
  "explore-bid-options",
  "get-my-timetable-detail",
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
        // Single shared pipeline (auth → confirm-gate → budget → run → shape);
        // policy preserves this path's historical semantics: destructive gate
        // for writes, separate mcp-write:/mcp-read: buckets, raw text envelope.
        const out = await dispatchToolCall({
          tool: tool as never,
          params,
          ctx,
          policy: {
            confirm: !tool.readOnly,
            budget: tool.readOnly ? "read" : "write",
            shape: "text",
          },
        });
        if ("error" in out)
          return {
            isError: true as const,
            content: [{ type: "text" as const, text: out.error }],
          };
        if (out.isError)
          return {
            isError: true as const,
            content: out.content.map((c) => ({
              type: "text" as const,
              text: c.text,
            })),
          };
        return {
          content: out.content.map((c) => ({
            type: "text" as const,
            text: c.text,
          })),
        };
      },
    );
  }
}
