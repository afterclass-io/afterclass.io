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
        const sc = data as {
          context?: string;
          reviews?: Array<{
            body?: string | null;
            tips?: string | null;
            rating?: number | null;
            labels?: string[];
            professorName?: string | null;
          }>;
        };
        const reviews = Array.isArray(sc.reviews) ? sc.reviews : [];
        const head = `Reviews for ${sc.context ?? ""} — ${reviews.length} reviews`;
        if (reviews.length === 0) return head;
        // One line per review: rating, labels, professor, body-or-tips
        // snippet (truncated so a 20-review payload stays compact).
        const lines = reviews.map((r) => {
          const stars = typeof r.rating === "number" ? `★${r.rating}` : "★?";
          const labels = Array.isArray(r.labels) && r.labels.length > 0 ? ` [${r.labels.join(", ")}]` : "";
          const prof = r.professorName ? ` ${r.professorName}` : "";
          const snippet = (r.body ?? r.tips ?? "").slice(0, 120);
          return `${stars}${labels}${prof} — ${snippet}`.trim();
        });
        return `${head}:\n${lines.join("\n")}`;
      },
    }),
);
