import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { asSchema } from "../schema";
import { reviewCardsOutput } from "./schemas";
import { runViewTool } from "./results";

const tool = allTools.find((t) => t.name === "get-course-reviews")!;

export const getCourseReviews = server.tool(
  {
    name: "get-course-reviews",
    description: tool.description,
    inputSchema: asSchema(tool.inputSchema),
    outputSchema: asSchema(reviewCardsOutput),
    annotations: { readOnlyHint: true },
    view: { name: "review-cards", description: "Course reviews", prefersBorder: true },
  },
  async (params, ctx) =>
    runViewTool({
      ctx,
      params,
      tool,
      schema: reviewCardsOutput,
      rawPayloadMessage: "Invalid review payload",
      summarize: (data) => {
        const sc = data as { context?: string; reviews?: unknown[] };
        return `Reviews for ${sc.context ?? ""} — ${Array.isArray(sc.reviews) ? sc.reviews.length : 0} reviews`;
      },
    }),
);
