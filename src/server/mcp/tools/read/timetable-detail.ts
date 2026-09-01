import { z } from "zod";

import { db } from "@/server/db";

import { resolveTermIdOrError } from "../../current";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const getMyTimetableDetailSchema = z.object({
  timetableId: z
    .string()
    .optional()
    .describe(
      "Optional: the id of one of the user's timetables (from my-timetables). Omit to resolve the active timetable for the term automatically.",
    ),
  acadTermId: z
    .string()
    .optional()
    .describe(
      "Optional: the academic term id (from list-acad-terms) to look up the user's active timetable in. Omit to use the current academic term.",
    ),
});

// Structural view of the `timetable.getArrangement` return we map from
// (`{ slots, bids }` on main). MCP only needs `slots` for the flat mapping,
// so we widen the view and rebuild `timetable` from `meta` when available.
interface ArrangementTiming {
  dayOfWeek: string | null;
  startTime: string;
  endTime: string;
  venue: string | null;
}

interface ArrangementSlot {
  classId: string;
  courseCode: string;
  courseName: string;
  section: string;
  professorName: string | null;
  creditUnits: number;
  timings: ArrangementTiming[];
  examTimings?: unknown[];
}

type Arrangement = {
  timetable?: { id: string; name: string };
  slots: ArrangementSlot[];
  bids?: unknown[];
};

/** Flatten one slot per weekly class timing, using a student-facing field set. */
function toFlatSlots(arrangement: Arrangement) {
  return arrangement.slots.flatMap((slot) =>
    slot.timings.map((timing) => ({
      classId: slot.classId,
      courseCode: slot.courseCode,
      courseName: slot.courseName,
      section: slot.section,
      day: timing.dayOfWeek,
      startTime: timing.startTime,
      endTime: timing.endTime,
      venue: timing.venue,
      professor: slot.professorName,
      creditUnits: slot.creditUnits,
    })),
  );
}

function toDetail(
  arrangement: Arrangement,
  timetableId: string,
  name: string,
  meta?: { isActive: boolean; termId?: string },
) {
  return {
    timetableId: arrangement.timetable?.id ?? timetableId,
    name: arrangement.timetable?.name ?? name,
    // Only emit isActive/termId when we actually know them (i.e. after a
    // listMine lookup). Emitting isActive: false for an id we never resolved
    // would be affirmatively wrong for the user's active timetable.
    ...(meta
      ? { isActive: meta.isActive, ...(meta.termId ? { termId: meta.termId } : {}) }
      : {}),
    slots: toFlatSlots(arrangement),
  };
}

export const getMyTimetableDetailTool: McpTool<typeof getMyTimetableDetailSchema> = {
  name: "get-my-timetable-detail",
  description:
    "Get the full weekly arrangement of your timetable including class times, venues, and professors - use when a student asks 'show me my timetable' or 'what classes do I have?'",
  inputSchema: getMyTimetableDetailSchema,
  readOnly: true,
  run: async ({ caller, user }, { timetableId, acadTermId }) => {
    try {
      let id = timetableId;
      // Populated only when a listMine lookup can tell us the truth about this
      // timetable. When only timetableId is given (no enrichment), meta stays
      // undefined and isActive/termId are omitted from the response rather
      // than defaulted to false/absent-with-marker.
      let meta: { isActive: boolean; termId?: string } | undefined;
      let resolvedName: string | undefined;

      if (!id) {
        // Omitted/empty acadTermId (with no timetableId) defaults to the
        // current academic term. A provided timetableId already pins the term,
        // so it never triggers a term default.
        let termId = acadTermId?.trim() ?? "";
        if (!termId) {
          const resolved = await resolveTermIdOrError(caller);
          if (!resolved.ok) return errText(resolved.errText);
          termId = resolved.value;
        }
        const mine = await caller.timetable.listMine({ acadTermId: termId });
        const active = mine.find((t) => t.isActive) ?? mine[0];
        if (!active) {
          return errText(
            `You don't have any timetables for academic term ${termId}. Create one first, then ask again.`,
          );
        }
        id = active.id;
        resolvedName = active.name;
        meta = { isActive: active.isActive, termId: active.acadTermId };
      } else if (acadTermId?.trim()) {
        // Enrich metadata (isActive/termId) from listMine when we can.
        const mine = await caller.timetable.listMine({ acadTermId: acadTermId.trim() });
        const match = mine.find((t) => t.id === id);
        if (match) {
          resolvedName = match.name;
          meta = { isActive: match.isActive, termId: match.acadTermId };
        }
      }

      const arrangement = (await caller.timetable.getArrangement({
        timetableId: id,
      })) as Arrangement;

      // Main's getArrangement returns { slots, bids } (no timetable object).
      // The tool contract requires the real timetable name, so resolve it when
      // the arrangement doesn't include it and listMine didn't already provide it.
      let name = resolvedName ?? arrangement.timetable?.name;
      if (!name) {
        const row = await db.userTimetable.findUnique({
          where: { id },
          select: { name: true, userId: true },
        });
        if (!row || row.userId !== user.id) {
          return errText(`Timetable ${id} not found.`);
        }
        name = row.name;
      }

      return jsonText(toDetail(arrangement, id, name, meta));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
