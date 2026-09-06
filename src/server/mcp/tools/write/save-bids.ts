import { z } from "zod";

import {
  resolveClassIdByCodeSection,
  resolveOpenWindowIdOrError,
} from "../../current";
import { bidPlanToViewProps, buildBidPlan } from "../bid-plan-shared";
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
      // Resolve default open window once if any entry lacks bidWindowId.
      const needsDefault = bids.some((b) => b.bidWindowId === undefined);
      let defaultWindowId: number | null = null;
      let defaultWindowErr: string | null = null;
      if (needsDefault) {
        const resolved = await resolveOpenWindowIdOrError(caller);
        if (resolved.ok) defaultWindowId = resolved.value;
        else defaultWindowErr = resolved.errText;
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

        // Resolve classId by courseCode+section in the current term (thin wrapper over caller.classes.getAll).
        // I10: single getCurrentWindow() call per entry, reused as termId below.
        let classId: string | null = null;
        let termId: string | undefined;
        try {
          try {
            const cw = await caller.bidWindows.getCurrentWindow();
            // eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- explicit null check narrows cw for the non-optional cw.acadTermId access below; cw?.id would not narrow
            if (cw && cw.id === bidWindowId) termId = cw.acadTermId;
            // getCurrentWindow returns the "current" window (active -> upcoming -> past);
            // if bidWindowId differs, we won't know its term; leave termId undefined and let getAll search broadly.
            // This is acceptable as courseCode+section narrows well.
            else termId = cw?.acadTermId ?? undefined;
          } catch {
            // ignore
          }
          classId = await resolveClassIdByCodeSection(caller, {
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
          // Attempt to learn the term for plan building from listMine match.
          try {
            const mine =
              (await caller.userBids.listMine()) as unknown as Array<{
                classId: string;
                bidWindowId: number;
                bidWindow?: { acadTermId: string | null } | null;
              }>;
            const m = mine.find(
              (b) => b.classId === classId && b.bidWindowId === bidWindowId,
            );
            if (m?.bidWindow?.acadTermId)
              succeededAcadTermIds.add(m.bidWindow.acadTermId);
          } catch {
            // non-fatal
          }
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
        // All failed: still try to build plan for the default window's term if we have one.
        if (defaultWindowId !== null) {
          try {
            const cw =
              (await caller.bidWindows.getCurrentWindow()) as unknown as {
                acadTermId: string;
              } | null;
            if (cw?.acadTermId) {
              try {
                plan = await buildBidPlan(caller, cw.acadTermId);
              } catch {
                plan = null;
              }
            }
          } catch {
            // ignore
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
