import { z } from "zod";

import { bidPlanToWidgetProps, buildBidPlan } from "../bid-plan-shared";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

// Mirrors the UserBidStatus enum in prisma/schema.prisma
// (PLANNED | SECURED | DROPPED | CANCELLED | PARTICIPATED).
const setBidStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["PLANNED", "SECURED", "DROPPED", "CANCELLED", "PARTICIPATED"]),
});

export const setBidStatusTool: McpTool<typeof setBidStatusSchema> = {
  name: "set-bid-status",
  description:
    "Set the status of one of the user's bids: PLANNED, SECURED, DROPPED, CANCELLED, or PARTICIPATED. Use after bid results release or when a student reports a bid outcome. Returns the full updated bid plan for the affected term.",
  inputSchema: setBidStatusSchema,
  widgetName: "bid-plan",
  toWidgetProps: bidPlanToWidgetProps,
  run: async ({ caller }, { id, status }) => {
    try {
      const updated = (await caller.userBids.setStatus({ id, status })) as unknown as Record<
        string,
        unknown
      > & { classId?: string };
      let acadTermId: string | null =
        (updated as { acadTermId?: string })?.acadTermId ?? null;
      if (!acadTermId && updated?.classId) {
        try {
          const bids = await caller.userBids.listMine();
          const updatedId = (updated as { id?: string }).id ?? id;
          const m = bids.find((b) => b.id === updatedId);
          acadTermId = m?.bidWindow?.acadTermId ?? null;
        } catch {
          // ignore enrichment failure
        }
      }
      if (!acadTermId) {
        try {
          const bids = await caller.userBids.listMine();
          const m2 = bids.find((b) => b.id === id);
          acadTermId = m2?.bidWindow?.acadTermId ?? null;
        } catch {
          // ignore
        }
      }
      if (!acadTermId) return jsonText({ updated, plan: null });
      const plan = await buildBidPlan(caller, acadTermId);
      return jsonText({ updated, plan });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
