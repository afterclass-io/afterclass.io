import "server-only";

import { db } from "@/server/db";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";

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
 * Returns `null` when the token is invalid, revoked, or the timetable
 * does not exist.  Does NOT throw — the route handler maps `null` → 404.
 */
export async function getFeedData(
  token: string,
): Promise<ICalFeedData | null> {
  const timetable = await db.userTimetable.findUnique({
    where: { icalToken: token },
    include: {
      acadTerm: true,
      slots: {
        include: {
          class: {
            include: {
              course: true,
              classTimings: true,
              classExamTimings: true,
            },
          },
        },
      },
    },
  });

  if (!timetable) return null;

  const classes: ArrangedClass[] = timetable.slots.map((slot) => ({
    classId: slot.class.id,
    courseCode: slot.class.course.code,
    courseName: slot.class.course.name,
    section: slot.class.section,
    professorName: null, // intentionally omitted — no PII in feed
    creditUnits: slot.class.course.creditUnits,
    timings: slot.class.classTimings.map((t) => ({
      dayOfWeek: t.dayOfWeek,
      startTime: t.startTime,
      endTime: t.endTime,
      venue: t.venue,
    })),
    examTimings: slot.class.classExamTimings.map((e) => ({
      date: e.date,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      venue: e.venue,
    })),
  }));

  return {
    classes,
    termStart: timetable.acadTerm.startDt,
    termEnd: timetable.acadTerm.endDt,
    timetableName: timetable.name,
  };
}
