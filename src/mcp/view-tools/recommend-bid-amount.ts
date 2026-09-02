import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { buildToolContext } from "../user";
import { bidRecommendationOutput } from "./schemas";
import { errorResult, guardedParse, isRawPayload, unwrapResultData } from "./results";

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
  async (params, ctx) => {
    const toolCtx = await buildToolContext(ctx as never);
    if (!toolCtx) return errorResult("Unauthorized");
    const result = await tool.run(toolCtx, params as never);
    if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
    const unwrapped = unwrapResultData(result, tool, "");
    if (!unwrapped.ok) return errorResult("Invalid JSON from catalog");
    const structuredContent: unknown = unwrapped.data;
    if (isRawPayload(structuredContent)) return errorResult("Invalid bid recommendation payload");
    const parsed = guardedParse(bidRecommendationOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    const sc = structuredContent as { suggestedBidAmount?: number; classId?: string };
    const summary =
      typeof sc.suggestedBidAmount === "number"
        ? `Suggested bid ${sc.suggestedBidAmount} for class ${sc.classId ?? ""}`.trim()
        : "Bid recommendation ready";
    return {
      content: [{ type: "text" as const, text: summary }],
      structuredContent,
    };
  },
);
