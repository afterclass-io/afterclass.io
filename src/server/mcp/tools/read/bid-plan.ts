import { z } from "zod";

import { resolveTermId } from "../../current";
import { bidPlanToViewProps, buildBidPlan } from "../bid-plan-shared";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const myBidPlanSchema = z.object({
  acadTermId: z
    .string()
    .optional()
    .describe("Academic term id, e.g. from list-acad-terms"),
});

export const myBidPlanTool: McpTool<typeof myBidPlanSchema> = {
  name: "my-bid-plan",
  description:
    "Show the user's bidding plan for one academic term: every saved bid (course, section, professor, amount, status, round/window) plus the budget balance. Use this when the user asks about their current bids or bidding plans for a term/academic year.",
  inputSchema: myBidPlanSchema,
  readOnly: true,
  toViewProps: bidPlanToViewProps,
  run: async ({ caller }, { acadTermId }) => {
    try {
      const term = await resolveTermId(caller, acadTermId);
      if (!term.ok) return errText(term.errText);
      const plan = await buildBidPlan(caller, term.value);
      // Direct viewProps writers (Task 11): no JSON round-trip — the view
      // channel carries the typed plan; the text envelope stays for the model.
      return {
        ...jsonText(plan),
        viewProps: plan as unknown as Record<string, unknown>,
      };
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
