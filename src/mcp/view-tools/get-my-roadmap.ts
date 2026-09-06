import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { roadmapsMinePage } from "@/server/mcp/tools/page-links";
import { asSchema } from "../schema";
import { roadmapOutput } from "./schemas";
import { runViewTool } from "./results";

const tool = allTools.find((t) => t.name === "get-my-roadmap")!;

export const getMyRoadmap = server.tool(
  {
    name: "get-my-roadmap",
    description: tool.description,
    inputSchema: asSchema(tool.inputSchema),
    outputSchema: asSchema(roadmapOutput),
    annotations: { readOnlyHint: true },
    view: {
      name: "roadmap-view",
      description: "Study roadmap",
      prefersBorder: true,
    },
  },
  async (params, ctx) =>
    runViewTool({
      ctx,
      params,
      tool,
      schema: roadmapOutput,
      rawPayloadMessage: "Invalid roadmap payload",
      summarize: (data) => {
        const sc = data as {
          name?: string;
          progress?: { completed?: number; total?: number };
          entries?: Array<{
            yearNumber?: number;
            term?: string;
            courseCode?: string;
          }>;
        };
        const entries = Array.isArray(sc.entries) ? sc.entries : [];
        const progressPart =
          typeof sc.progress?.completed === "number" &&
          typeof sc.progress?.total === "number"
            ? ` (${sc.progress.completed} of ${sc.progress.total} courses completed)`
            : "";
        const head = `Roadmap "${sc.name ?? ""}" — ${entries.length} entries${progressPart}`;
        const link = `\nOpen roadmap: ${roadmapsMinePage()}`;
        if (entries.length === 0) return `${head}${link}`;
        // Group course codes by year+term so the model sees the term grid.
        const groups = new Map<string, string[]>();
        for (const e of entries) {
          const key = `Y${e.yearNumber} ${e.term}`;
          const list = groups.get(key) ?? [];
          if (e.courseCode) list.push(e.courseCode);
          groups.set(key, list);
        }
        const lines = [...groups.entries()].map(
          ([k, codes]) => `${k}: ${codes.join(", ")}`,
        );
        return `${head}:\n${lines.join("\n")}${link}`;
      },
    }),
);
