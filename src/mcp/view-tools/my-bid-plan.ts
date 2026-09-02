import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { buildToolContext } from "../user";
import { bidPlanOutput } from "./schemas";
import { errorResult, guardedParse, isRawPayload, unwrapResultData } from "./results";

const tool = allTools.find((t) => t.name === "my-bid-plan")!;

export const myBidPlan = server.tool(
  {
    name: "my-bid-plan",
    description: tool.description,
    inputSchema: tool.inputSchema as never,
    outputSchema: bidPlanOutput as never,
    annotations: { readOnlyHint: true },
    view: { name: "bid-plan", description: "Bidding plan", prefersBorder: true },
  },
  async (params, ctx) => {
    const toolCtx = await buildToolContext(ctx as never);
    if (!toolCtx) return errorResult("Unauthorized");
    const result = await tool.run(toolCtx, params as never);
    if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
    const unwrapped = unwrapResultData(result, tool);
    if (!unwrapped.ok) return errorResult("Invalid JSON from catalog");
    const structuredContent: unknown = unwrapped.data;
    if (isRawPayload(structuredContent)) return errorResult("Invalid bid plan payload");
    const parsed = guardedParse(bidPlanOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    const sc = structuredContent as { bids?: unknown[]; acadTermId?: string };
    const count = Array.isArray(sc.bids) ? sc.bids.length : 0;
    return {
      content: [{ type: "text" as const, text: `Bid plan for ${sc.acadTermId ?? ""} — ${count} bids` }],
      structuredContent,
    };
  },
);
