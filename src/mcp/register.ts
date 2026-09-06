import type { MCPServer } from "mcp-use";

import { allTools } from "@/server/mcp/tools";
import { buildToolContext } from "./user";
import { asSchema } from "./schema";
import { errorResult, textResult } from "./view-tools/results";
import {
  checkDestructiveConfirm,
  checkReadBudget,
  checkWriteBudget,
} from "./rate-limit";

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
        const toolCtx = await buildToolContext(ctx as never);
        if (!toolCtx)
          return errorResult(
            "Unauthorized: no verified identity and dev bypass is off. For local Inspector use `bun run mcp:dev` with MCP_DEV_BYPASS=true (see MCP.md).",
          );
        if (!tool.readOnly) {
          // Destructive tools need explicit confirm:true — except under the
          // local dev bypass (same NODE_ENV + MCP_DEV_BYPASS boundary as
          // resolveDevBypassUser in user.ts, never active in production or in
          // tests), where Inspector testing would otherwise be unable to
          // exercise deletes at all.
          const nodeEnv: string = process.env.NODE_ENV ?? "";
          const devBypass =
            process.env.MCP_DEV_BYPASS === "true" &&
            (nodeEnv === "" || nodeEnv === "development");
          if (!devBypass) {
            const unconfirmed = checkDestructiveConfirm(tool.name, params);
            if (unconfirmed) return errorResult(unconfirmed);
          }
          const limited = await checkWriteBudget(toolCtx);
          if (limited) return errorResult(limited);
        } else {
          // Read-only tools draw from their own per-user read bucket
          // (`mcp-read:` prefix) so token-spray reads cannot run unbounded
          // and read bursts can never starve the write budget.
          const limited = await checkReadBudget(toolCtx);
          if (limited) return errorResult(limited);
        }
        try {
          const result = await tool.run(toolCtx, params);
          if (result.isError)
            return errorResult(result.content[0]?.text ?? "Tool failed");
          const text = result.content[0]?.text ?? "";
          return textResult(text);
        } catch {
          return errorResult(`Internal error in tool ${tool.name}`);
        }
      },
    );
  }
}
