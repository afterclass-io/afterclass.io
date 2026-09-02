import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { bidRecommendationOutput } from "./schemas";
import { runViewTool } from "./results";

const tool = allTools.find((t) => t.name === "recommend-bid-amount")!;

export const recommendBidAmount = server.tool(
  {
    name: "recommend-bid-amount",
    description: tool.description,
    inputSchema: tool.inputSchema as never,
    outputSchema: bidRecommendationOutput as never,
    annotations: { readOnlyHint: true },
    view: { name: "bid-recommendation", description: "Bid recommendation", prefersBorder: true },
  },
  async (params, ctx) =>
    runViewTool({
      ctx,
      params,
      tool,
      schema: bidRecommendationOutput,
      fallbackJson: "",
      rawPayloadMessage: "Invalid bid recommendation payload",
      summarize: (data) => {
        const sc = data as { suggestedBidAmount?: number; classId?: string };
        return typeof sc.suggestedBidAmount === "number"
          ? `Suggested bid ${sc.suggestedBidAmount} for class ${sc.classId ?? ""}`.trim()
          : "Bid recommendation ready";
      },
    }),
);
