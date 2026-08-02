import ical, { ICalCalendarMethod, ICalEventRepeatingFreq, ICalWeekday } from "ical-generator";
import type { ArrangedClass, ClassExamTiming } from "@/modules/timetable/components/TimetableGrid";
import type { ClassTimingLike } from "@/modules/timetable/functions/slot-math";

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

/** Map full day-of-week strings to iCal weekday enum values. */
const DAY_MAP: Record<string, ICalWeekday> = {
  Monday: ICalWeekday.MO,
  Tuesday: ICalWeekday.TU,
  Wednesday: ICalWeekday.WE,
  Thursday: ICalWeekday.TH,
  Friday: ICalWeekday.FR,
  Saturday: ICalWeekday.SA,
  Sunday: ICalWeekday.SU,
};

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
 * Build a Date representing a specific SGT wall-clock time.
 * Uses ISO-8601 extended format with +08:00 offset so the Date carries
 * the correct UTC instant.
 */
function sgtDateTime(
  year: number,
  month: number, // 1-based
  day: number,   // 1-based
  hours: number,
  minutes: number,
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+08:00`,
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

/** Parse "HH:MM" into [hours, minutes]. */
function parseTime(t: string): [number, number] {
  const parts = t.split(":").map(Number);
  return [parts[0]!, parts[1]!];
}

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
      const icalDay = timing.dayOfWeek ? DAY_MAP[timing.dayOfWeek] : undefined;
      if (!icalDay) continue;

      const [startH, startM] = parseTime(timing.startTime);
      const [endH, endM] = parseTime(timing.endTime);

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
        until: termEnd,
      });
    }

    // --- Exam timings → one-off VEVENTs ---
    for (const exam of cls.examTimings) {
      const examDate =
        typeof exam.date === "string" ? new Date(exam.date) : exam.date;
      const [startH, startM] = parseTime(exam.startTime);
      const [endH, endM] = parseTime(exam.endTime);
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
// For now, let me restructure.
