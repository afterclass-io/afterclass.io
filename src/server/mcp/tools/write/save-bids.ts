import { z } from "zod";

import { bidPlanToViewProps, buildBidPlan } from "../bid-plan-shared";
import { buildTermMap, resolveEntryClass } from "../bid-write-helpers";
import { stripBidNotes } from "../bid-shared";
import {
  confirmField,
  errText,
  errorMessage,
  jsonText,
  type McpTool,
} from "../../types";

const bidEntrySchema = z.object({
  courseCode: z.string().min(1).describe("Course code, e.g. COR-IS1702"),
  section: z.string().min(1).describe("Section, e.g. G1"),
  bidAmount: z
    .number()
    .positive()
    .max(99999)
    .describe("Bid amount in e-credits"),
  bidWindowId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Optional bid window id; omit to use the current open window. Call get-bid-windows to look up a specific window.",
    ),
  notes: z.string().max(500).optional().describe("Optional private notes"),
});

const saveBidsSchema = z.object({
  bids: z
    .array(bidEntrySchema)
    .min(1)
    .max(20)
    .describe("Array of bids to save (1..20 entries)"),
  ...confirmField,
});

export const saveBidsTool: McpTool<typeof saveBidsSchema> = {
  name: "save-bids",
  description:
    "Save multiple bids in one call (bulk transactional) - costs only one write token. Provide an array of { courseCode, section, bidAmount, optional bidWindowId, optional notes } (each bid targets a specific class section). Resolves each classId via the classes procedure by code+section in the current term. bidWindowId defaults to the current open window (per-entry override allowed); if no window is open and no id is given, the entry fails with a friendly 'ask the user for round + window' message. Returns { updated: per-entry results, plan: the full updated bid plan for the affected term } (buildBidPlan); private notes are accepted as input but never echoed in the output, so the caller has the full updated bid plan with no separate follow-up call needed. Partial failures are reported per row (succeeded/failed) without aborting other rows; a transaction abort would fail all remaining.",
  inputSchema: saveBidsSchema,
  toViewProps: bidPlanToViewProps,
  run: async ({ caller }, { bids }) => {
    try {
      // Hoisted once per call (was once per entry): the current window (class-
      // search term hint + default-window verification) and the full bid list
      // indexed for O(1) term lookup. Both tolerate failure — resolution then
      // degrades to a broad search / null plan instead of throwing.
      const cw = await caller.bidWindows.getCurrentWindow().catch(() => null);
      const mine = await caller.userBids.listMine().catch(() => []);
      const termMap = buildTermMap(mine);

      // Default-window semantics mirror resolveOpenWindowIdOrError
      // (src/server/mcp/current.ts): the current window must be VERIFIED open,
      // else entries without an explicit bidWindowId fail with ask-user text.
      const needsDefault = bids.some((b) => b.bidWindowId === undefined);
      const now = new Date();
      const isOpen =
        !!cw &&
        !!cw.opensAt &&
        !!cw.resultsAt &&
        cw.opensAt <= now &&
        now < cw.resultsAt;
      let defaultWindowId: number | null = null;
      let defaultWindowErr: string | null = null;
      if (needsDefault) {
        // The extra `cw &&` is only for narrowing (isOpen already implies non-null).
        if (cw && isOpen) defaultWindowId = cw.id;
        else
          defaultWindowErr =
            "No bid window is currently open for bidding. Ask the user which bid round and window to use, or call get-bid-windows and let the user pick.";
      }

      type PerEntry =
        | {
            ok: true;
            index: number;
            courseCode: string;
            section: string;
            result: unknown;
          }
        | {
            ok: false;
            index: number;
            courseCode: string;
            section: string;
            error: string;
          };

      const updated: PerEntry[] = [];
      const succeededAcadTermIds = new Set<string>();

      for (let i = 0; i < bids.length; i++) {
        const entry = bids[i]!;
        const courseCode = entry.courseCode.trim();
        const section = entry.section.trim();
        const bidAmount = entry.bidAmount;

        let bidWindowId: number | undefined = entry.bidWindowId;
        if (bidWindowId === undefined) {
          if (defaultWindowErr) {
            updated.push({
              ok: false,
              index: i,
              courseCode,
              section,
              error: defaultWindowErr,
            });
            continue;
          }
          bidWindowId = defaultWindowId ?? undefined;
          if (bidWindowId === undefined) {
            updated.push({
              ok: false,
              index: i,
              courseCode,
              section,
              error: "No bid window is currently open for bidding.",
            });
            continue;
          }
        }

        // Resolve classId by courseCode+section, hinted with the hoisted current
        // window's term (no per-entry fetch). Overrides targeting other windows
        // fall back to a broad search inside resolveEntryClass — courseCode +
        // section narrows well on its own.
        const termId = cw?.acadTermId ?? undefined;
        let classId: string | null = null;
        try {
          classId = await resolveEntryClass(caller, {
            courseCode,
            section,
            termId,
          });
          if (!classId) {
            updated.push({
              ok: false,
              index: i,
              courseCode,
              section,
              error: `Class for ${courseCode} section ${section} not found${termId ? ` in term ${termId}` : ""}.`,
            });
            continue;
          }
        } catch (e) {
          updated.push({
            ok: false,
            index: i,
            courseCode,
            section,
            error: errorMessage(e),
          });
          continue;
        }

        // Upsert via existing procedure (thin wrapper — no duplicated data-access logic).
        try {
          const result = await caller.userBids.upsert({
            classId,
            bidWindowId,
            bidAmount,
            notes: entry.notes,
          });
          // Learn the term for plan building from the hoisted index (note: the
          // index predates this call's upserts — see the fallback below).
          const known = termMap.get(`${classId ?? ""}|${bidWindowId}`);
          if (known) succeededAcadTermIds.add(known);
          // The pre-loop listMine cannot contain rows created by this call
          // (e.g. a first-time bidder whose list was empty), so fall back to
          // the current window's term when the upsert targeted it.
          else if (cw?.id === bidWindowId && cw?.acadTermId)
            succeededAcadTermIds.add(cw.acadTermId);
          updated.push({ ok: true, index: i, courseCode, section, result });
        } catch (e) {
          updated.push({
            ok: false,
            index: i,
            courseCode,
            section,
            error: errorMessage(e),
          });
        }
      }

      // Build the plan for the affected term (first succeeded term, or no plan if all failed).
      let plan: unknown = null;
      if (succeededAcadTermIds.size > 0) {
        const acadTermId = [...succeededAcadTermIds][0]!;
        try {
          plan = await buildBidPlan(caller, acadTermId);
        } catch {
          plan = null;
        }
      } else if (updated.every((u) => !u.ok)) {
        // All failed: still try to build plan for the default window's term if
        // we have one (cw is already hoisted — no extra fetch).
        if (defaultWindowId !== null && cw?.acadTermId) {
          try {
            plan = await buildBidPlan(caller, cw.acadTermId);
          } catch {
            plan = null;
          }
        }
      }

      // Shape matches { updated, plan } envelope used by other bid write tools.
      // Private notes are accepted as input but never echoed: strip them per entry.
      const scrubbed = updated.map((e) =>
        e.ok && typeof e.result === "object" && e.result !== null
          ? { ...e, result: stripBidNotes(e.result) }
          : e,
      );
      return jsonText({ updated: scrubbed, plan });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
