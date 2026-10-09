import { z } from "zod";

import { getBidLimits } from "@/server/config/chat-config";
import { bidPlanToViewProps, buildBidPlan } from "../bid-plan-shared";
import { buildTermMap } from "../bid-write-helpers";
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
    .max(getBidLimits().maxBidAmount)
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

      const updated: PerEntry[] = new Array<PerEntry>(bids.length);
      const succeededAcadTermIds = new Set<string>();

      type ValidWindowEntry = {
        index: number;
        courseCode: string;
        section: string;
        bidAmount: number;
        bidWindowId: number;
        notes?: string;
      };

      const validWindowEntries: ValidWindowEntry[] = [];

      for (let i = 0; i < bids.length; i++) {
        const entry = bids[i]!;
        const courseCode = entry.courseCode.trim();
        const section = entry.section.trim();
        const bidAmount = entry.bidAmount;

        let bidWindowId: number | undefined = entry.bidWindowId;
        if (bidWindowId === undefined) {
          if (defaultWindowErr) {
            updated[i] = {
              ok: false,
              index: i,
              courseCode,
              section,
              error: defaultWindowErr,
            };
            continue;
          }
          bidWindowId = defaultWindowId ?? undefined;
          if (bidWindowId === undefined) {
            updated[i] = {
              ok: false,
              index: i,
              courseCode,
              section,
              error: "No bid window is currently open for bidding.",
            };
            continue;
          }
        }

        validWindowEntries.push({
          index: i,
          courseCode,
          section,
          bidAmount,
          bidWindowId,
          notes: entry.notes,
        });
      }

      type ResolvedEntry = {
        index: number;
        courseCode: string;
        section: string;
        classId: string;
        bidWindowId: number;
        bidAmount: number;
        notes?: string;
      };

      const validResolvedEntries: ResolvedEntry[] = [];
      const termId = cw?.acadTermId ?? undefined;

      if (validWindowEntries.length > 0) {
        let resolvedItems: Array<{
          courseCode: string;
          section: string;
          classId: string | null;
        }> = [];
        try {
          resolvedItems = await caller.classes.resolveByCodeSections({
            items: validWindowEntries.map((e) => ({
              courseCode: e.courseCode,
              section: e.section,
            })),
            acadTermId: termId,
          });
        } catch (e) {
          const errMsg = errorMessage(e);
          for (const entry of validWindowEntries) {
            updated[entry.index] = {
              ok: false,
              index: entry.index,
              courseCode: entry.courseCode,
              section: entry.section,
              error: errMsg,
            };
          }
        }

        if (resolvedItems.length > 0) {
          for (let k = 0; k < validWindowEntries.length; k++) {
            const entry = validWindowEntries[k]!;
            const resolved = resolvedItems[k];
            const classId = resolved?.classId ?? null;
            if (!classId) {
              updated[entry.index] = {
                ok: false,
                index: entry.index,
                courseCode: entry.courseCode,
                section: entry.section,
                error: `Class for ${entry.courseCode} section ${entry.section} not found${termId ? ` in term ${termId}` : ""}.`,
              };
            } else {
              validResolvedEntries.push({
                index: entry.index,
                courseCode: entry.courseCode,
                section: entry.section,
                classId,
                bidWindowId: entry.bidWindowId,
                bidAmount: entry.bidAmount,
                notes: entry.notes,
              });
            }
          }
        }
      }

      if (validResolvedEntries.length > 0) {
        try {
          const upsertResults = await caller.userBids.upsertMany({
            entries: validResolvedEntries.map((e) => ({
              classId: e.classId,
              bidWindowId: e.bidWindowId,
              bidAmount: e.bidAmount,
              notes: e.notes,
            })),
          });

          for (let j = 0; j < validResolvedEntries.length; j++) {
            const entry = validResolvedEntries[j]!;
            const res = upsertResults[j];
            if (res?.ok) {
              const known = termMap.get(
                `${entry.classId}|${entry.bidWindowId}`,
              );
              if (known) succeededAcadTermIds.add(known);
              else if (cw?.id === entry.bidWindowId && cw?.acadTermId)
                succeededAcadTermIds.add(cw.acadTermId);

              updated[entry.index] = {
                ok: true,
                index: entry.index,
                courseCode: entry.courseCode,
                section: entry.section,
                result: res.bid,
              };
            } else {
              updated[entry.index] = {
                ok: false,
                index: entry.index,
                courseCode: entry.courseCode,
                section: entry.section,
                error: res?.message ?? "Failed to save bid",
              };
            }
          }
        } catch (e) {
          const errMsg = errorMessage(e);
          for (const entry of validResolvedEntries) {
            updated[entry.index] = {
              ok: false,
              index: entry.index,
              courseCode: entry.courseCode,
              section: entry.section,
              error: errMsg,
            };
          }
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
