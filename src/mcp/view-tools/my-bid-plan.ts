import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { asSchema } from "../schema";
import { bidPlanOutput } from "./schemas";
import { runViewTool } from "./results";

const tool = allTools.find((t) => t.name === "my-bid-plan")!;

export const myBidPlan = server.tool(
  {
    name: "my-bid-plan",
    description: tool.description,
    inputSchema: asSchema(tool.inputSchema),
    outputSchema: asSchema(bidPlanOutput),
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
        const sc = data as {
          bids?: Array<{
            courseCode?: string;
            section?: string;
            professorName?: string | null;
            bidAmount?: number;
            status?: string;
            round?: string;
            window?: number;
          }>;
          acadTermId?: string;
          budget?: { balance?: number } | null;
        };
        const bids = Array.isArray(sc.bids) ? sc.bids : [];
        const balancePart = typeof sc.budget?.balance === "number" ? `balance ${sc.budget.balance}, ` : "";
        const head = `Bid plan for ${sc.acadTermId ?? ""} — ${balancePart}${bids.length} bids`;
        if (bids.length === 0) return head;
        const lines = bids.map((b) => {
          const prof = b.professorName ? ` (${b.professorName})` : "";
          return `${b.courseCode} ${b.section}${prof}: ${b.bidAmount} — ${b.status} R${b.round}W${b.window}`;
        });
        return `${head}:\n${lines.join("\n")}`;
      },
    }),
);
