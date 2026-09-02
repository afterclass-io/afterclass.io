import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { buildToolContext } from "../user";
import { reviewCardsOutput } from "./schemas";
import { errorResult, guardedParse, isRawPayload, unwrapResultData } from "./results";

const tool = allTools.find((t) => t.name === "get-course-reviews")!;

export const getCourseReviews = server.tool(
  {
    name: "get-course-reviews",
    description: tool.description,
    inputSchema: tool.inputSchema as never,
    outputSchema: reviewCardsOutput as never,
    annotations: { readOnlyHint: true },
    view: { name: "review-cards", description: "Course reviews", prefersBorder: true },
  },
  async (params, ctx) => {
    const toolCtx = await buildToolContext(ctx as never);
    if (!toolCtx) return errorResult("Unauthorized");
    const result = await tool.run(toolCtx, params as never);
    if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
    const unwrapped = unwrapResultData(result, tool);
    if (!unwrapped.ok) return errorResult("Invalid JSON from catalog");
    const structuredContent: unknown = unwrapped.data;
    if (isRawPayload(structuredContent)) return errorResult("Invalid review payload");
    const parsed = guardedParse(reviewCardsOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    const sc = structuredContent as { context?: string; reviews?: unknown[] };
    return {
      content: [
        {
          type: "text" as const,
          text: `Reviews for ${sc.context ?? ""} — ${Array.isArray(sc.reviews) ? sc.reviews.length : 0} reviews`,
        },
      ],
      structuredContent,
    };
  },
);
