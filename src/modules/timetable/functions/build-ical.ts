import ical, { ICalCalendarMethod, ICalEventRepeatingFreq, ICalWeekday } from "ical-generator";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";
import { dayOfWeekToIcalCode } from "@/common/functions/day-of-week";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ICalInput = {
  /** Classes from getArrangement (or equivalent server-side query). */
  classes: ArrangedClass[];
  /** First day of the academic term (SGT date). */
  termStart: Date;
  /** Last day of the academic term (SGT date). */
  termEnd: Date;
  /** Display name for the calendar feed (X-WR-CALNAME). */
  timetableName: string;
};

// ---------------------------------------------------------------------------
// Day-of-week mapping
// ---------------------------------------------------------------------------

/** Map iCal weekday enum to JS day-of-week number (0=Sun … 6=Sat). */
const ICAL_DAY_TO_JS: Record<string, number> = {
  [ICalWeekday.SU]: 0,
  [ICalWeekday.MO]: 1,
  [ICalWeekday.TU]: 2,
  [ICalWeekday.WE]: 3,
  [ICalWeekday.TH]: 4,
  [ICalWeekday.FR]: 5,
  [ICalWeekday.SA]: 6,
};

// ---------------------------------------------------------------------------
// SGT date helpers
// ---------------------------------------------------------------------------

/**
 * Build a Date whose *local* wall-clock fields equal the given SGT time.
 *
 * ical-generator renders plain Date objects using their local wall-clock
 * fields together with the event's TZID, so constructing the Date in local
 * time makes the emitted `DTSTART;TZID=Asia/Singapore:...` correct regardless
 * of the server's timezone. (Singapore is UTC+8 year-round, no DST.)
 */
function sgtDateTime(
  year: number,
  month: number, // 1-based
  day: number,   // 1-based
  hours: number,
  minutes: number,
): Date {
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Convert a Date instant to a Date whose local wall-clock fields equal the
 * instant's SGT wall-clock time (see `sgtDateTime` for why).
 */
function sgtWallClockAsLocal(d: Date): Date {
  // Shift the instant to SGT, then read the shifted UTC fields as local time
  const sgt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return new Date(
    sgt.getUTCFullYear(),
    sgt.getUTCMonth(),
    sgt.getUTCDate(),
    sgt.getUTCHours(),
    sgt.getUTCMinutes(),
    sgt.getUTCSeconds(),
  );
}

/** Extract SGT year/month/day from a Date as [y, m, d] (1-based month). */
function sgtYMD(d: Date): [number, number, number] {
  // Convert UTC timestamp to SGT by adding 8 hours, then read UTC fields
  const sgt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return [sgt.getUTCFullYear(), sgt.getUTCMonth() + 1, sgt.getUTCDate()];
}

/**
 * Find the first occurrence of `icalDay` (MO/TU/…) on or after `after` date.
 * Returns a UTC-midnight Date representing that SGT calendar date.
 */
function firstOccurrence(icalDay: ICalWeekday, after: Date): Date {
  const target = ICAL_DAY_TO_JS[icalDay];
  if (target === undefined) throw new Error(`Unknown iCal day: ${icalDay}`);

  const [y, m, d] = sgtYMD(after);
  const afterJsDay = new Date(Date.UTC(y, m - 1, d)).getDay();
  const daysToAdd = (target - afterJsDay + 7) % 7;

  return new Date(Date.UTC(y, m - 1, d + daysToAdd));
}

import { parseTimePartsSafe } from "@/common/functions/time";

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Build an iCalendar (RFC 5545) feed string for a timetable.
 *
 * - One VEVENT per class timing: weekly RRULE bounded by termEnd.
 * - One VEVENT per exam timing: single occurrence, no RRULE.
 * - All times in Asia/Singapore.
 * - No bid data or PII (professor names, etc.) in output.
 */
export function buildIcal(input: ICalInput): string {
  const { classes, termStart, termEnd, timetableName } = input;

  const cal = ical({
    name: timetableName,
    prodId: { company: "afterclass.io", product: "timetable" },
    timezone: "Asia/Singapore",
    method: ICalCalendarMethod.PUBLISH,
  });

  for (const cls of classes) {
    // --- Class timings → weekly recurring VEVENTs ---
    for (const timing of cls.timings) {
      const icalDayCode = dayOfWeekToIcalCode(timing.dayOfWeek);
      if (!icalDayCode) continue;
      // ICalWeekday enum values ARE the 2-letter codes ("MO".."SU").
      const icalDay = icalDayCode as ICalWeekday;

      const startParts = parseTimePartsSafe(timing.startTime);
      const endParts = parseTimePartsSafe(timing.endTime);
      if (!startParts || !endParts) continue;

      const [startH, startM] = startParts;
      const [endH, endM] = endParts;

      const firstDate = firstOccurrence(icalDay, termStart);
      const [fy, fm, fd] = sgtYMD(firstDate);

      const start = sgtDateTime(fy, fm, fd, startH, startM);
      const end = sgtDateTime(fy, fm, fd, endH, endM);

      const event = cal.createEvent({
        start,
        end,
        summary: `${cls.courseCode} ${cls.section}`,
        location: timing.venue ?? undefined,
        timezone: "Asia/Singapore",
      });

      event.repeating({
        freq: ICalEventRepeatingFreq.WEEKLY,
        byDay: [icalDay],
        until: sgtWallClockAsLocal(termEnd),
      });
    }

    // --- Exam timings → one-off VEVENTs ---
    for (const exam of cls.examTimings) {
      const examDate =
        typeof exam.date === "string" ? new Date(exam.date) : exam.date;
      const startParts = parseTimePartsSafe(exam.startTime);
      const endParts = parseTimePartsSafe(exam.endTime);
      if (!startParts || !endParts) continue;

      const [startH, startM] = startParts;
      const [endH, endM] = endParts;
      const [ey, em, ed] = sgtYMD(examDate);

      const start = sgtDateTime(ey, em, ed, startH, startM);
      const end = sgtDateTime(ey, em, ed, endH, endM);

      cal.createEvent({
        start,
        end,
        summary: `${cls.courseCode} Exam`,
        location: exam.venue ?? undefined,
        timezone: "Asia/Singapore",
      });
    }
  }

  return cal.toString();
}
