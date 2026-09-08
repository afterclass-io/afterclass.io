import { z } from "zod";

import { resolveOpenWindowIdOrError, resolveTermId } from "../../current";
import { bidPlanToViewProps, buildBidPlan } from "../bid-plan-shared";
import { buildTermMap } from "../bid-write-helpers";
import { stripBidNotes } from "../bid-shared";
import {
  confirmField,
  errText,
  errorMessage,
  jsonText,
  type McpTool,
  type RouterOutputs,
} from "../../types";
// (confirmField kept: remove-bid + set-bid-budget are Tier-1 confirm-gated.)

import { getBidLimits } from "@/server/config/chat-config";

// Canonical values live in `src/server/config/chat-config.ts` (`maxBidAmount`
// 99999, `maxBidBudget` 10000); read through the getter (zod schemas can
// reference function calls — static schemas stay valid).
const MAX_BID_AMOUNT: number = getBidLimits().maxBidAmount;
// Tier 2 (Task 7, budget-only): no confirmField — confirm:true is not
// advertised for constructive writes (the Tier-1 gate never sees them).
const upsertBidSchema = z.object({
  classId: z.string(),
  bidWindowId: z.number().int().positive().optional(),
  bidAmount: z.number().positive().max(MAX_BID_AMOUNT),
  notes: z.string().max(500).optional(),
});

export const upsertBidTool: McpTool<typeof upsertBidSchema> = {
  name: "upsert-bid",
  description:
    "Create or update one of the user's bids for a class in a bid window. Use get-bid-windows for valid window ids. Returns the full updated bid plan for the affected term.",
  inputSchema: upsertBidSchema,
  toViewProps: bidPlanToViewProps,
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
        acadTermId =
          buildTermMap(bids).get(`${updated.classId}|${updated.bidWindowId}`) ??
          null;
      } catch {
        // Non-fatal — plan enrichment failed; return updated alone below.
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

const removeBidSchema = z.object({ id: z.string(), ...confirmField });

export const removeBidTool: McpTool<typeof removeBidSchema> = {
  name: "remove-bid",
  description:
    "Delete one of the user's bids by its id. Returns the full updated bid plan for the affected term.",
  inputSchema: removeBidSchema,
  toViewProps: bidPlanToViewProps,
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
      const raw: RouterOutputs["userBids"]["remove"] =
        await caller.userBids.remove({ id });
      if (!acadTermId && raw && typeof raw.acadTermId === "string")
        acadTermId = raw.acadTermId;
      const updated = { success: raw?.success ?? true };
      if (!acadTermId) return jsonText({ updated, plan: null });
      const plan = await buildBidPlan(caller, acadTermId);
      return jsonText({ updated, plan });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

/** Canonical `maxBidBudget` in `src/server/config/chat-config.ts`, read through the getter. Kept exported (module-scope getter call) so existing `MAX_BUDGET` imports keep working. */
export const MAX_BUDGET: number = getBidLimits().maxBidBudget;

const setBidBudgetSchema = z.object({
  acadTermId: z.string().optional(),
  balance: z.number().min(0).max(MAX_BUDGET),
  ...confirmField,
});

export const setBidBudgetTool: McpTool<typeof setBidBudgetSchema> = {
  name: "set-bid-budget",
  description: `Set the user's bid budget balance for an academic term. balance must be between 0 and ${MAX_BUDGET}. Returns the full updated bid plan for the affected term.`,
  inputSchema: setBidBudgetSchema,
  toViewProps: bidPlanToViewProps,
  run: async ({ caller }, input) => {
    if (input.balance > MAX_BUDGET) {
      return errText(
        `Budget balance ${input.balance} exceeds the maximum of ${MAX_BUDGET}. Choose a balance at or below ${MAX_BUDGET}.`,
      );
    }
    try {
      const term = await resolveTermId(caller, input.acadTermId);
      if (!term.ok) return errText(term.errText);
      const updated = await caller.userBids.upsertBudget({
        ...input,
        acadTermId: term.value,
      });
      const plan = await buildBidPlan(caller, term.value);
      return jsonText({ updated, plan });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
