import { TRPCError } from "@trpc/server";

import { LINK_SHARING_REQUIRED_MESSAGE } from "@/modules/timetable/functions/calendar-links";

/**
 * Determine whether an academic term has ended.
 * Returns true when current time is strictly after the term end date.
 */
export function isTermEnded(endDt: Date, now: Date = new Date()): boolean {
  return now > endDt;
}

/**
 * Assert that calendar link export is allowed for this timetable.
 * Refuses private timetables and timetables whose term has ended.
 */
export function assertCalendarLinkAllowed(
  timetable: {
    visibility: string;
    acadTerm: { endDt: Date };
  },
  now: Date = new Date(),
): void {
  if (timetable.visibility === "PRIVATE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: LINK_SHARING_REQUIRED_MESSAGE,
    });
  }

  if (isTermEnded(timetable.acadTerm.endDt, now)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "This term has ended, so a calendar link can no longer be created",
    });
  }
}
