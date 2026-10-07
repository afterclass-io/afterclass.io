import { toIsoDate, todayIsoSGT } from "@/common/functions/term-date-bounds";

type DatedMeeting = { startDate: Date | string; endDate: Date | string };

/**
 * Splits meetings into upcoming (end date today or later, soonest first) and
 * past (most recently ended first). Days are compared in Singapore time.
 */
export function groupMeetingsByStatus<T extends DatedMeeting>(
  meetings: readonly T[],
  now: Date = new Date(),
): { upcoming: T[]; past: T[] } {
  const today = todayIsoSGT(now);
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const meeting of meetings) {
    (toIsoDate(meeting.endDate) >= today ? upcoming : past).push(meeting);
  }

  upcoming.sort((a, b) => toIsoDate(a.startDate).localeCompare(toIsoDate(b.startDate)));
  past.sort((a, b) => toIsoDate(b.endDate).localeCompare(toIsoDate(a.endDate)));
  return { upcoming, past };
}
