import { z } from "zod";

import { bidPlanToViewProps, buildBidPlan } from "../bid-plan-shared";
import { stripBidNotes } from "../bid-shared";
import {
  confirmField,
  errText,
  errorMessage,
  jsonText,
  type McpTool,
  type RouterOutputs,
} from "../../types";

// Mirrors the UserBidStatus enum in prisma/schema.prisma
// (PLANNED | SECURED | DROPPED | CANCELLED | PARTICIPATED).
const setBidStatusSchema = z.object({
  id: z.string(),
  status: z.enum([
    "PLANNED",
    "SECURED",
    "DROPPED",
    "CANCELLED",
    "PARTICIPATED",
  ]),
  ...confirmField,
});

export const setBidStatusTool: McpTool<typeof setBidStatusSchema> = {
  name: "set-bid-status",
  description:
    "Set the status of one of the user's bids: PLANNED, SECURED, DROPPED, CANCELLED, or PARTICIPATED. Use after bid results release or when a student reports a bid outcome. Returns the full updated bid plan for the affected term.",
  inputSchema: setBidStatusSchema,
  toViewProps: bidPlanToViewProps,
  run: async ({ caller }, { id, status }) => {
    try {
      const updated: RouterOutputs["userBids"]["setStatus"] =
        await caller.userBids.setStatus({
          id,
          status,
        });
      // M5: one listMine lookup (not two) for the term enrichment below.
      let bids: Array<{
        id: string;
        bidWindow?: { acadTermId: string | null } | null;
      }> | null = null;
      const listMineOnce = async () => {
        if (!bids) {
          try {
            bids = await caller.userBids.listMine();
          } catch {
            bids = null;
          }
        }
        return bids;
      };
      let acadTermId: string | null =
        (updated as { acadTermId?: string })?.acadTermId ?? null;
      if (!acadTermId && updated?.classId) {
        const rows = await listMineOnce();
        const updatedId = (updated as { id?: string }).id ?? id;
        const m = rows?.find((b) => b.id === updatedId);
        acadTermId = m?.bidWindow?.acadTermId ?? null;
      }
      if (!acadTermId) {
        const rows = await listMineOnce();
        const m2 = rows?.find((b) => b.id === id);
        acadTermId = m2?.bidWindow?.acadTermId ?? null;
      }
      if (!acadTermId)
        return jsonText({ updated: stripBidNotes(updated), plan: null });
      const plan = await buildBidPlan(caller, acadTermId);
      return jsonText({ updated: stripBidNotes(updated), plan });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
