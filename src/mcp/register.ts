import type { MCPServer } from "mcp-use";

import { allTools } from "@/server/mcp/tools";
import {
  getToolAnnotations,
  getToolRegistration,
  type ToolAnnotations,
} from "./annotations";
import { asSchema } from "./schema";
import { dispatchToolCall } from "./dispatch";
import { MCP_DISABLED_TEXT, checkMcpEnabled } from "./view-tools/results";

// Re-exported so existing importers keep working: the derivation lives in
// ./annotations alongside the view-bound adapters' usage. register.ts
// stays the registration loop; it does not own the annotation semantics.
export { getToolAnnotations, getToolRegistration, type ToolAnnotations };

import { searchCourses } from "./view-tools/search-courses";
import { getTimetableCalendarLink } from "./view-tools/get-timetable-calendar-link";
import { myBidPlan } from "./view-tools/my-bid-plan";
import { getMyRoadmap } from "./view-tools/get-my-roadmap";
import { getCourseReviews } from "./view-tools/get-course-reviews";
import { exploreBidOptions } from "./view-tools/explore-bid-options";
import { getMyTimetableDetail } from "./view-tools/get-my-timetable-detail";

// The 7 view-bound tool names are registered by view-tools/* (module scope,
// exported ToolRefs); this loop skips them and registers the remaining 43 as
// generic CallToolResult: (recommend-bid-amount is viewless — its view was
// removed — so it registers here.) The set is derived from the ToolRefs so a
// rename breaks loudly (undefined `.name`) instead of silently
// double-registering. Import from the view-tools/* modules directly —
// register.ts must NOT import ./index (index.ts imports register.ts).
export const viewBoundNames = new Set<string>(
  [
    searchCourses,
    getTimetableCalendarLink,
    myBidPlan,
    getMyRoadmap,
    getCourseReviews,
    exploreBidOptions,
    getMyTimetableDetail,
  ].map((ref) => ref.name),
);

export function registerViewlessTools(server: MCPServer): void {
  for (const tool of allTools) {
    if (viewBoundNames.has(tool.name)) continue;
    // Discoverability plumbing: annotations derive from the catalog
    // `readOnly` flag + the `destructiveTools` confirm-gate set, and
    // destructive tools surface their `confirm:true` requirement in the
    // description text so it shows up in `tools/list`.
    const { title, description, annotations } = getToolRegistration(tool.name);
    server.tool(
      {
        name: tool.name,
        title,
        description,
        inputSchema: asSchema(tool.inputSchema),
        annotations,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mcp-use context generic varies across Hono versions; params-first signature is what matters
      async (params: unknown, ctx: any) => {
        // MCP kill-switch (MCP transport layer ONLY): mcpEnabled=false
        // refuses before tool execution. The chat route shares
        // dispatchToolCall but never passes through here, so it is
        // unaffected — pin that with the dispatch test (chat-shaped policy
        // still runs with the flag off). Shared helper/text with the
        // view-bound adapters (view-tools/results.ts).
        const disabled = await checkMcpEnabled();
        if (disabled)
          return {
            isError: true as const,
            content: [
              {
                type: "text" as const,
                text: MCP_DISABLED_TEXT,
              },
            ],
          };
        // Single shared pipeline (auth → confirm-gate → budget → run → shape);
        // policy preserves this path's historical semantics: destructive gate
        // for writes, separate mcp-write:/mcp-read: buckets, raw text envelope.
        const out = await dispatchToolCall({
          tool: tool,
          params,
          ctx,
          policy: {
            confirm: !tool.readOnly,
            budget: tool.readOnly ? "read" : "write",
            shape: "text",
            // Token pass-through: MCP hosts forward a confirmToken
            // issued out-of-band; the gate verifies it against the same app
            // secret the chat path uses.
            confirmSecret:
              process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
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
