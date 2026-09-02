import { z } from "zod";

import { resolveOpenWindowIdOrError, resolveTermId } from "../../current";
import { bidPlanToWidgetProps, buildBidPlan } from "../bid-plan-shared";
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
    "Create or update one of the user's bids for a class in a bid window. Use get-bid-windows for valid window ids. Returns the full updated bid plan for the affected term.",
  inputSchema: upsertBidSchema,
  toWidgetProps: bidPlanToWidgetProps,
  run: async ({ caller }, input) => {
    try {
      let bidWindowId = input.bidWindowId;
      if (bidWindowId === undefined) {
        const resolved = await resolveOpenWindowIdOrError(caller);
        if (!resolved.ok) return errText(resolved.errText);
        bidWindowId = resolved.value;
      }
      const updated = await caller.userBids.upsert({
        classId: input.classId,
        bidWindowId,
        bidAmount: input.bidAmount,
        notes: input.notes,
      });
      let acadTermId: string | null = null;
      try {
        const bids = await caller.userBids.listMine();
        const matched = bids.find(
          (b) => b.classId === updated.classId && b.bidWindowId === updated.bidWindowId,
        );
        acadTermId = matched?.bidWindow?.acadTermId ?? null;
      } catch {
        // Non-fatal — plan enrichment failed; return updated alone below.
      }
      if (!acadTermId) return jsonText({ updated, plan: null });
      const plan = await buildBidPlan(caller, acadTermId);
      return jsonText({ updated, plan });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const removeBidSchema = z.object({ id: z.string() });

export const removeBidTool: McpTool<typeof removeBidSchema> = {
  name: "remove-bid",
  description: "Delete one of the user's bids by its id. Returns the full updated bid plan for the affected term.",
  inputSchema: removeBidSchema,
  toWidgetProps: bidPlanToWidgetProps,
  run: async ({ caller }, { id }) => {
    try {
      let acadTermId: string | null = null;
      try {
        const bids = await caller.userBids.listMine();
        const existing = bids.find((b) => b.id === id);
        acadTermId = existing?.bidWindow?.acadTermId ?? null;
      } catch {
        // Non-fatal — continue to delete even if term resolution failed pre-delete.
      }
      const raw = (await caller.userBids.remove({ id })) as unknown as {
        acadTermId?: string | null;
        success?: boolean;
      };
      if (!acadTermId && raw && typeof raw.acadTermId === "string") acadTermId = raw.acadTermId;
      const updated = { success: raw?.success ?? true };
      if (!acadTermId) return jsonText({ updated, plan: null });
      const plan = await buildBidPlan(caller, acadTermId);
      return jsonText({ updated, plan });
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
  description: `Set the user's bid budget balance for an academic term. balance must be between 0 and ${MAX_BUDGET}. Returns the full updated bid plan for the affected term.`,
  inputSchema: setBidBudgetSchema,
  toWidgetProps: bidPlanToWidgetProps,
  run: async ({ caller }, input) => {
    if (input.balance > MAX_BUDGET) {
      return errText(
        `Budget balance ${input.balance} exceeds the maximum of ${MAX_BUDGET}. Choose a balance at or below ${MAX_BUDGET}.`,
      );
    }
    try {
      const term = await resolveTermId(caller, input.acadTermId);
      if (!term.ok) return errText(term.errText);
      const updated = await caller.userBids.upsertBudget({ ...input, acadTermId: term.value });
      const plan = await buildBidPlan(caller, term.value);
      return jsonText({ updated, plan });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
