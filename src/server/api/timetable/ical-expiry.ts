import { TRPCError } from "@trpc/server";

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
      message:
        "Set your timetable to link-sharing before creating a calendar link",
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
