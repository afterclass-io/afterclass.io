import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { asSchema } from "../schema";
import { bidRecommendationOutput } from "./schemas";
import { runViewTool } from "./results";

const tool = allTools.find((t) => t.name === "recommend-bid-amount")!;

export const recommendBidAmount = server.tool(
  {
    name: "recommend-bid-amount",
    description: tool.description,
    inputSchema: asSchema(tool.inputSchema),
    outputSchema: asSchema(bidRecommendationOutput),
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
        const sc = data as {
          suggestedBidAmount?: number;
          classId?: string;
          predictedMedian?: number;
          acadTermId?: string;
          bidWindow?: { round?: string; window?: number };
        };
        const winPart = sc.bidWindow ? ` R${sc.bidWindow.round}W${sc.bidWindow.window}` : "";
        return `Suggested bid ${sc.suggestedBidAmount} for class ${sc.classId ?? ""} (predicted median ${sc.predictedMedian}, ${sc.acadTermId ?? ""}${winPart})`.trim();
      },
    }),
);
