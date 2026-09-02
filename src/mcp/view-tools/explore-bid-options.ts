import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { buildToolContext } from "../user";
import { bidExplorerOutput } from "./schemas";
import { errorResult, guardedParse, isRawPayload, unwrapResultData } from "./results";

const tool = allTools.find((t) => t.name === "explore-bid-options")!;

export const exploreBidOptions = server.tool(
  {
    name: "explore-bid-options",
    description: tool.description,
    inputSchema: tool.inputSchema as never,
    outputSchema: bidExplorerOutput as never,
    annotations: { readOnlyHint: true },
    view: { name: "bid-explorer", description: "Bid explorer", prefersBorder: true },
  },
  async (params, ctx) => {
    const toolCtx = await buildToolContext(ctx as never);
    if (!toolCtx) return errorResult("Unauthorized");
    const result = await tool.run(toolCtx, params as never);
    if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
    const unwrapped = unwrapResultData(result, tool);
    if (!unwrapped.ok) return errorResult("Invalid JSON from catalog");
    const structuredContent: unknown = unwrapped.data;
    if (isRawPayload(structuredContent)) return errorResult("Invalid bid explorer payload");
    const parsed = guardedParse(bidExplorerOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    return {
      content: [{ type: "text" as const, text: "Bid options ready" }],
      structuredContent,
    };
  },
);
