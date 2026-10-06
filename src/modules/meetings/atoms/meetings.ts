import { atomWithStorage } from "jotai/utils";
import type { AvailabilityBrushMode } from "@/modules/meetings/components/grid/MeetingAvailabilityBrush";
import type { OverlaySource } from "@/modules/meetings/components/room/MeetingEditPanel";

/**
 * Whether the meeting room tour has been shown (or dismissed) in this
 * browser. Set when a started tour ends.
 */
export const hasSeenMeetingsTourAtom = atomWithStorage<boolean>(
  "hasSeenMeetingsTour",
  false,
  undefined,
  { getOnInit: true },
);

/**
 * User's preferred brush mode (Available, If Needed, or Unavailable).
 * Persisted in browser localStorage.
 */
export const meetingBrushModeAtom = atomWithStorage<AvailabilityBrushMode>(
  "meetingBrushMode",
  "AVAILABLE",
  undefined,
  { getOnInit: true },
);

/**
 * User preference to filter out "If Needed" participants from quorum calculations.
 * Persisted in browser localStorage.
 */
export const meetingHideIfNeededAtom = atomWithStorage<boolean>(
  "meetingHideIfNeeded",
  false,
  undefined,
  { getOnInit: true },
);

/**
 * User's active overlay visibility toggle states (Timetable and Google Calendar).
 * Persisted in browser localStorage.
 */
export const meetingVisibleOverlaysAtom = atomWithStorage<
  Record<OverlaySource, boolean>
>(
  "meetingVisibleOverlays",
  { timetable: true, google: true },
  undefined,
  { getOnInit: true },
);
