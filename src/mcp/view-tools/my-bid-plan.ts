import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { bidPlanOutput } from "./schemas";
import { runViewTool } from "./results";

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
  async (params, ctx) =>
    runViewTool({
      ctx,
      params,
      tool,
      schema: bidPlanOutput,
      rawPayloadMessage: "Invalid bid plan payload",
      summarize: (data) => {
        const sc = data as { bids?: unknown[]; acadTermId?: string };
        const count = Array.isArray(sc.bids) ? sc.bids.length : 0;
        return `Bid plan for ${sc.acadTermId ?? ""} — ${count} bids`;
      },
    }),
);
