import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { buildToolContext } from "../user";
import { roadmapOutput } from "./schemas";
import { errorResult, guardedParse, isRawPayload, unwrapResultData } from "./results";

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
  async (params, ctx) => {
    const toolCtx = await buildToolContext(ctx as never);
    if (!toolCtx) return errorResult("Unauthorized");
    const result = await tool.run(toolCtx, params as never);
    if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
    const unwrapped = unwrapResultData(result, tool);
    if (!unwrapped.ok) return errorResult("Invalid JSON from catalog");
    const structuredContent: unknown = unwrapped.data;
    if (isRawPayload(structuredContent)) return errorResult("Invalid roadmap payload");
    const parsed = guardedParse(roadmapOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    const sc = structuredContent as { name?: string; entries?: unknown[] };
    return {
      content: [
        {
          type: "text" as const,
          text: `Roadmap "${sc.name ?? ""}" — ${Array.isArray(sc.entries) ? sc.entries.length : 0} entries`,
        },
      ],
      structuredContent,
    };
  },
);
