import { z } from "zod";

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
    "Set the status of one of the user's bids: PLANNED, SECURED, DROPPED, CANCELLED, or PARTICIPATED. Use after bid results release or when a student reports a bid outcome.",
  inputSchema: setBidStatusSchema,
  run: async ({ caller }, { id, status }) => {
    try {
      return jsonText(await caller.userBids.setStatus({ id, status }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
