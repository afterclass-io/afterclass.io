import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { roadmapOutput } from "./schemas";
import { runViewTool } from "./results";

const tool = allTools.find((t) => t.name === "get-my-roadmap")!;

export const getMyRoadmap = server.tool(
  {
    name: "get-my-roadmap",
    description: tool.description,
    inputSchema: tool.inputSchema as never,
    outputSchema: roadmapOutput as never,
    annotations: { readOnlyHint: true },
    view: { name: "roadmap-view", description: "Study roadmap", prefersBorder: true },
  },
  async (params, ctx) =>
    runViewTool({
      ctx,
      params,
      tool,
      schema: roadmapOutput,
      rawPayloadMessage: "Invalid roadmap payload",
      summarize: (data) => {
        const sc = data as { name?: string; entries?: unknown[] };
        return `Roadmap "${sc.name ?? ""}" — ${Array.isArray(sc.entries) ? sc.entries.length : 0} entries`;
      },
    }),
);
