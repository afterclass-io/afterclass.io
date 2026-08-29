import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const myBidPlanSchema = z.object({
  acadTermId: z.string().describe("Academic term id, e.g. from list-acad-terms"),
});

export const myBidPlanTool: McpTool<typeof myBidPlanSchema> = {
  name: "my-bid-plan",
  description:
    "Show the user's bidding plan for one academic term: every saved bid (course, section, professor, amount, status, round/window) plus the budget balance. Use this when the user asks about their current bids or bidding plans for a term/academic year.",
  inputSchema: myBidPlanSchema,
  readOnly: true,
  widgetName: "bid-plan",
  toWidgetProps: (result) => {
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { raw: text };
    }
  },
  run: async ({ caller }, { acadTermId }) => {
    try {
      const [bids, budget] = await Promise.all([
        caller.userBids.listMine(),
        caller.userBids.getBudget({ acadTermId }),
      ]);
      const plan = bids
        .filter((b) => b.bidWindow?.acadTermId === acadTermId)
        .map((b) => ({
          id: b.id,
          bidAmount: b.bidAmount,
          status: b.status,
          courseCode: b.courseCode,
          courseName: b.courseName,
          section: b.section,
          professorName: b.professorName ?? null,
          round: b.bidWindow.round,
          window: b.bidWindow.window,
        }));
      return jsonText({ acadTermId, budget, bids: plan });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
