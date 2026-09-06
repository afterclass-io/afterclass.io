import type { MCPServer } from "mcp-use";

import { allTools } from "@/server/mcp/tools";
import { destructiveTools } from "./rate-limit";
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

/** MCP `tools/list` annotations derived from the catalog at registration. */
export interface ToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
  idempotentHint: boolean;
}

/**
 * Derive a viewless tool's `tools/list` annotations from the catalog
 * `readOnly` flag plus the `destructiveTools` confirm-gate set
 * (`src/mcp/rate-limit.ts`).
 *
 * - `readOnly:true` → `readOnlyHint:true`, `idempotentHint:true`
 *   (reads change nothing, so repeats are safe).
 * - In the destructive set → `destructiveHint:true`, `idempotentHint:false`.
 * - Other writes (constructive create/upsert) → `destructiveHint:false`,
 *   `idempotentHint:false` (conservative: a retried write re-charges the
 *   budget and may append/overwrite, so clients must not assume repeats
 *   are free).
 * - `openWorldHint:false` for every catalog tool: all 50 operate on local
 *   resources only (Postgres + seed data; URL-building is string
 *   formatting, no external network calls).
 * - `title` humanizes the tool name (`remove-timetable` →
 *   `"Remove Timetable"`) for UI/end-user contexts.
 *
 * Unknown names (never happen in the registration loop, which iterates
 * `allTools`) fall back to the non-destructive write shape so the gate
 * stays fail-closed on the annotation side too. Created here (Task 6);
 * Task 11 extends this with per-tool `outputSchema` backfill.
 */
export function getToolAnnotations(name: string): ToolAnnotations {
  const tool = allTools.find((t) => t.name === name);
  const readOnly = tool?.readOnly === true;
  const destructive = destructiveTools.has(name);
  const title = name
    .split("-")
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
  return {
    title,
    readOnlyHint: readOnly,
    destructiveHint: destructive,
    openWorldHint: false,
    idempotentHint: readOnly,
  };
}

/**
 * Registration descriptor for one viewless tool: annotations plus the
 * description text with the `confirm:true` requirement surfaced for
 * destructive tools (mirrors the `checkDestructiveConfirm` gate message
 * so `tools/list` readers learn the requirement before calling).
 */
export function getToolRegistration(name: string): {
  title: string;
  description: string;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
    idempotentHint: boolean;
  };
} {
  const tool = allTools.find((t) => t.name === name);
  const {
    title,
    readOnlyHint,
    destructiveHint,
    openWorldHint,
    idempotentHint,
  } = getToolAnnotations(name);
  const description =
    (tool?.description ?? name) +
    (destructiveHint
      ? " Requires explicit confirmation: pass confirm:true only after showing the user exactly what will change and getting explicit approval."
      : "");
  return {
    title,
    description,
    annotations: {
      readOnlyHint,
      destructiveHint,
      openWorldHint,
      idempotentHint,
    },
  };
}

export function registerViewlessTools(server: MCPServer): void {
  for (const tool of allTools) {
    if (viewBoundNames.has(tool.name)) continue;
    // Discoverability plumbing (Task 6; extended in Task 11 with
    // outputSchema backfill): annotations derive from the catalog
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
