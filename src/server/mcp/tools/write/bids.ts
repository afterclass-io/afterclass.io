import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const upsertBidSchema = z.object({
  classId: z.string(),
  bidWindowId: z.number().int().positive(),
  bidAmount: z.number().positive().max(99999),
  notes: z.string().max(500).optional(),
});

export const upsertBidTool: McpTool<typeof upsertBidSchema> = {
  name: "upsert-bid",
  description:
    "Create or update one of the user's bids for a class in a bid window. Use get-bid-windows for valid window ids.",
  inputSchema: upsertBidSchema,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.userBids.upsert(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const removeBidSchema = z.object({ id: z.string() });

export const removeBidTool: McpTool<typeof removeBidSchema> = {
  name: "remove-bid",
  description: "Delete one of the user's bids by its id.",
  inputSchema: removeBidSchema,
  run: async ({ caller }, { id }) => {
    try {
      return jsonText(await caller.userBids.remove({ id }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

export const MAX_BUDGET = 10000;

const setBidBudgetSchema = z.object({
  acadTermId: z.string(),
  balance: z.number().min(0).max(MAX_BUDGET),
});

export const setBidBudgetTool: McpTool<typeof setBidBudgetSchema> = {
  name: "set-bid-budget",
  description: `Set the user's bid budget balance for an academic term. balance must be between 0 and ${MAX_BUDGET}.`,
  inputSchema: setBidBudgetSchema,
  run: async ({ caller }, input) => {
    if (input.balance > MAX_BUDGET) {
      return errText(
        `Budget balance ${input.balance} exceeds the maximum of ${MAX_BUDGET}. Choose a balance at or below ${MAX_BUDGET}.`,
      );
    }
    try {
      return jsonText(await caller.userBids.upsertBudget(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
