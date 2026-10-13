import { timetablePage } from "@/server/mcp/tools/page-links";
import { bidPlanOutput } from "./schemas";
import { registerViewTool } from "./make-view-tool";

// Shared lookup + named-throw + registration derivation.
export const myBidPlan = registerViewTool({
  name: "my-bid-plan",
  view: { name: "bid-plan", description: "Bidding plan" },
  outputSchema: bidPlanOutput,
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
    const balancePart =
      typeof sc.budget?.balance === "number"
        ? `balance ${sc.budget.balance}, `
        : "";
    const head = `Bid plan for ${sc.acadTermId ?? ""} — ${balancePart}${bids.length} bids`;
    const link = `\nManage bids: ${timetablePage()}`;
    // Null-budget nudge (additive only): the model sees it even outside
    // the plan-bidding prompt path. Empty when a budget exists, so the
    // existing format stays byte-identical.
    const hint =
      sc.budget == null
        ? "\nNo budget set — offer set-bid-budget before suggesting amounts."
        : "";
    if (bids.length === 0) return `${head}${hint}${link}`;
    const lines = bids.map((b) => {
      const prof = b.professorName ? ` (${b.professorName})` : "";
      return `${b.courseCode} ${b.section}${prof}: ${b.bidAmount} — ${b.status} R${b.round}W${b.window}`;
    });
    return `${head}:${hint}\n${lines.join("\n")}${link}`;
  },
});
