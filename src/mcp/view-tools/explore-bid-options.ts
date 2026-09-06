import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { exploreLinkFor } from "@/server/mcp/tools/page-links";
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
      summarize: (data) => {
        const sc = data as {
          classId?: string | null;
          history?: Array<{
            acadTermId?: string;
            round?: string;
            window?: number;
            min?: number;
            median?: number;
            vacancy?: number | null;
          }>;
          prediction?: {
            medianPredicted?: number;
            minPredicted?: number | null;
            bidWindow?: { round?: string; window?: number };
          } | null;
        };
        const history = Array.isArray(sc.history) ? sc.history : [];
        const head = `Bid options for class ${sc.classId ?? ""} — ${history.length} history rows`.trim();
        const lines = history.map((h) => {
          const vacancy = typeof h.vacancy === "number" ? `, vacancy ${h.vacancy}` : "";
          return `${h.acadTermId} R${h.round}W${h.window}: min ${h.min}, median ${h.median}${vacancy}`;
        });
        if (sc.prediction) {
          const p = sc.prediction;
          const minPart = typeof p.minPredicted === "number" ? ` (min ${p.minPredicted})` : "";
          const winPart = p.bidWindow ? ` for round ${p.bidWindow.round} window ${p.bidWindow.window}` : "";
          lines.push(`Prediction: median ${p.medianPredicted}${minPart}${winPart}`);
        }
        const body = lines.length > 0 ? `${head}:\n${lines.join("\n")}` : head;
        // Inputs first (courseCode/section from adapter params), resolved
        // classId fallback from own output — never invented; omit when null.
        const input = params as { courseCode?: unknown; section?: unknown };
        const link = exploreLinkFor(
          typeof input.courseCode === "string" ? input.courseCode : undefined,
          typeof input.section === "string" ? input.section : undefined,
          { classId: sc.classId },
        );
        return link ? `${body}\nOpen in bid analytics: ${link}` : body;
      },
    }),
);
