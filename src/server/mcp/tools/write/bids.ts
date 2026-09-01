import { z } from "zod";

import { resolveOpenWindowIdOrError, resolveTermIdOrError } from "../../current";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const upsertBidSchema = z.object({
  classId: z.string(),
  bidWindowId: z.number().int().positive().optional(),
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
      // Omitted bidWindowId defaults to the current OPEN window ONLY. If no
      // window is open, ask the user for the round + window rather than
      // silently bidding in an upcoming/past window.
      let bidWindowId = input.bidWindowId;
      if (bidWindowId === undefined) {
        const resolved = await resolveOpenWindowIdOrError(caller);
        if (!resolved.ok) return errText(resolved.errText);
        bidWindowId = resolved.value;
      }
      return jsonText(
        await caller.userBids.upsert({
          classId: input.classId,
          bidWindowId,
          bidAmount: input.bidAmount,
          notes: input.notes,
        }),
      );
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
  acadTermId: z.string().optional(),
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
      let acadTermId = input.acadTermId?.trim() ?? "";
      if (!acadTermId) {
        const resolved = await resolveTermIdOrError(caller);
        if (!resolved.ok) return errText(resolved.errText);
        acadTermId = resolved.value;
      }
      return jsonText(await caller.userBids.upsertBudget({ ...input, acadTermId }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
