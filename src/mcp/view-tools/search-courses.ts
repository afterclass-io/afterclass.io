import { server } from "../server";
import { coursePage, searchPage } from "@/server/mcp/tools/page-links";
import { asSchema } from "../schema";
import { dispatchToolCall } from "../dispatch";
import { courseSearchOutput } from "./schemas";
import { errorResult, checkMcpEnabled, guardedParse } from "./results";
import { catalogToolOrThrow, makeViewTool } from "./make-view-tool";

// Shared lookup + named-throw (Task 11): same title/annotations/
// confirm-suffix as every viewless registration, so tools/list shows one
// consistent annotation story. View key stays local (view binding is not
// part of the shared derivation). This bespoke adapter keeps its own
// searchCoursesTool binding (array-tail below), so it uses the raw lookup.
const searchCoursesTool = catalogToolOrThrow("search-courses");
const registration = makeViewTool({
  name: "search-courses",
  view: { name: "course-search", description: "Course search results" },
  outputSchema: courseSearchOutput,
  summarize: () => "",
  rawPayloadMessage: "Invalid course search payload",
}).registration;

export const searchCourses = server.tool(
  {
    name: "search-courses",
    title: registration.title,
    description: registration.description,
    inputSchema: asSchema(searchCoursesTool.inputSchema),
    outputSchema: asSchema(courseSearchOutput),
    annotations: registration.annotations,
    view: {
      name: "course-search",
      description: "Course search results",
      prefersBorder: true,
    },
  },
  async (params, ctx) => {
    // Task 4 kill-switch (MCP transport layer ONLY — never the chat path):
    // refuse before auth/run when mcpEnabled=false.
    const disabled = await checkMcpEnabled();
    if (disabled) return errorResult(disabled);
    // Auth + run via the single shared pipeline (`shape: "view"` preserves
    // the raw catalog content); the bespoke array-tail below (masking, schema
    // guard, chained summary) is unchanged.
    const out = await dispatchToolCall({
      tool: searchCoursesTool,
      params,
      ctx,
      // No budget: the historical bespoke adapter went buildToolContext → run
      // with no budget charge (R1 budget-semantics parity; read-budget policy
      // for view tools is owned by a later task).
      policy: { confirm: false, budget: "none", shape: "view" },
    });
    if ("error" in out) return errorResult(out.error);
    if (out.isError) return errorResult(out.content[0]?.text ?? "Tool failed");
    // Preserve Invalid JSON semantics; don't use toViewProps which masks parse errors as {results:[]}.
    // Dispatch's view shape already applied toViewProps into
    // structuredContent — ignore it here and parse the raw catalog text
    // instead (dispatch content is the catalog result verbatim on success).
    const rawText = out.content[0]?.text;
    const jsonSource = rawText ?? "";
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonSource);
    } catch {
      return errorResult("Invalid JSON from catalog");
    }
    const data = parsedJson;
    // Masking a non-array to `[]` is acceptable here: it can only happen on the
    // success path (failures take the isError branch above), where the catalog
    // contract guarantees a JSON array of courses. A non-array would be a
    // catalog contract break, and keeping the View's `{ results: [] }` shape
    // intact beats failing the whole call for a malformed-but-nonempty payload.
    const structuredContent = { results: Array.isArray(data) ? data : [] };
    const parsed = guardedParse(courseSearchOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    // Content-carrying summary so the model can chain (e.g. resolve an exact
    // code, then call get-course-reviews) without guessing. Format is stable
    // by contract: `{code} | {name} | {n} sections` per hit.
    const hits = structuredContent.results as Array<{
      code?: string;
      name?: string;
      sections?: unknown[];
    }>;
    const lines = hits.map(
      (c) =>
        `${c.code} | ${c.name} | ${Array.isArray(c.sections) ? c.sections.length : 0} sections`,
    );
    const query = (params as { query?: unknown }).query;
    const base =
      lines.length > 0
        ? `Found ${hits.length} courses:\n${lines.join("\n")}`
        : `Found ${hits.length} courses`;
    const extra: string[] = [];
    if (typeof query === "string" && query.length > 0)
      extra.push(`Search page: ${searchPage(query)}`);
    // Per-hit page links only for short lists — beyond 5 hits the summary
    // list is long enough already; the search page alone suffices.
    if (hits.length > 0 && hits.length <= 5) {
      for (const c of hits) {
        if (typeof c.code === "string" && c.code.length > 0)
          extra.push(`${c.code}: ${coursePage(c.code)}`);
      }
    }
    const text = extra.length > 0 ? `${base}\n${extra.join("\n")}` : base;
    return {
      content: [{ type: "text" as const, text }],
      structuredContent,
    };
  },
);
