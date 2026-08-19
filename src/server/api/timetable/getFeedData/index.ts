import "server-only";

import { db as defaultDb } from "@/server/db";
import type { PrismaClient } from "@prisma/client";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";
import { toArrangedClass } from "@/modules/timetable/functions/arranged-class";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ICalFeedData = {
  classes: ArrangedClass[];
  termStart: Date;
  termEnd: Date;
  timetableName: string;
};

// ---------------------------------------------------------------------------
// getFeedData
// ---------------------------------------------------------------------------

/**
 * Resolve an iCal feed token to the data needed for `buildIcal`.
 *
 * - Looks up UserTimetable by `icalToken`.
 * - Fetches slots with full class data (timings, exam timings, course).
 * - Resolves the associated AcadTerm for startDt / endDt.
 *
 * Returns `null` when the token is invalid, revoked, the timetable
 * does not exist, or the timetable is PRIVATE (defense-in-depth:
 * `setVisibility` also revokes the token on PRIVATE).
 *
 * Does NOT throw — the route handler maps `null` → 404.
 *
 * Accepts an optional `dbOverride` parameter for testing.
 */
export async function getFeedData(
  token: string,
  dbOverride?: PrismaClient,
): Promise<ICalFeedData | null> {
  const client = dbOverride ?? defaultDb;
  const timetable = await client.userTimetable.findUnique({
    where: { icalToken: token },
    include: {
      acadTerm: { select: { startDt: true, endDt: true } },
      slots: {
        include: {
          class: {
            select: {
              id: true,
              section: true,
              course: { select: { code: true, name: true, creditUnits: true } },
              classTimings: { select: { dayOfWeek: true, startTime: true, endTime: true, venue: true } },
              classExamTimings: { select: { date: true, dayOfWeek: true, startTime: true, endTime: true, venue: true } },
            },
          },
        },
      },
    },
  });

  if (!timetable) return null;

  // PRIVATE timetables never serve a calendar feed, even with a valid token
  // (defense-in-depth: setVisibility also revokes the token on PRIVATE).
  if (timetable.visibility === "PRIVATE") return null;

  const classes = timetable.slots.map((slot) =>
    toArrangedClass(slot, { omitProfessorName: true }),
  );

  return {
    classes,
    termStart: timetable.acadTerm.startDt,
    termEnd: timetable.acadTerm.endDt,
    timetableName: timetable.name,
  };
}
