import type { MCPServer } from "mcp-use";

import { allTools } from "@/server/mcp/tools";
import { asSchema } from "./schema";
import { dispatchToolCall } from "./dispatch";

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
export const viewBoundNames: Set<string> = new Set(
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
