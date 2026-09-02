import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { buildToolContext } from "../user";
import { courseSearchOutput } from "./schemas";
import { errorResult, guardedParse, unwrapResultData } from "./results";

const searchCoursesTool = allTools.find((t) => t.name === "search-courses")!;

export const searchCourses = server.tool(
  {
    name: "search-courses",
    description: searchCoursesTool.description,
    inputSchema: searchCoursesTool.inputSchema as never,
    outputSchema: courseSearchOutput as never,
    annotations: { readOnlyHint: true },
    view: { name: "course-search", description: "Course search results", prefersBorder: true },
  },
  async (params, ctx) => {
    const toolCtx = await buildToolContext(ctx as never);
    if (!toolCtx) return errorResult("Unauthorized");
    const result = await searchCoursesTool.run(toolCtx, params as never);
    if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
    // Preserve Invalid JSON semantics; don't use toWidgetProps which masks parse errors as {results:[]}
    const unwrapped = unwrapResultData(result, undefined, "");
    if (!unwrapped.ok) return errorResult("Invalid JSON from catalog");
    const data = unwrapped.data;
    const structuredContent = { results: Array.isArray(data) ? data : [] };
    const parsed = guardedParse(courseSearchOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    return {
      content: [{ type: "text" as const, text: `Found ${(structuredContent.results as unknown[]).length} courses` }],
      structuredContent,
    };
  },
);
