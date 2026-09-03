import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { asSchema } from "../schema";
import { bidExplorerOutput } from "./schemas";
import { runViewTool } from "./results";

const tool = allTools.find((t) => t.name === "explore-bid-options")!;

export const exploreBidOptions = server.tool(
  {
    name: "explore-bid-options",
    description: tool.description,
    inputSchema: asSchema(tool.inputSchema),
    outputSchema: asSchema(bidExplorerOutput),
    annotations: { readOnlyHint: true },
    view: { name: "bid-explorer", description: "Bid explorer", prefersBorder: true },
  },
  async (params, ctx) =>
    runViewTool({
      ctx,
      params,
      tool,
      schema: bidExplorerOutput,
      rawPayloadMessage: "Invalid bid explorer payload",
      summarize: () => "Bid options ready",
    }),
);
