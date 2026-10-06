import { atomWithStorage } from "jotai/utils";

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
