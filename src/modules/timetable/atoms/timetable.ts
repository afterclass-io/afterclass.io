import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/** Currently selected academic term id. */
export const selectedTermIdAtom = atom<string | null>(null);

/** Currently active (viewed) timetable id. */
export const activeTimetableIdAtom = atom<string | null>(null);

/** Whether the grid is showing class or exam timings. */
export const timetableViewAtom = atom<"classes" | "exams">("classes");

/**
 * Width (px) of the right-hand course search panel on large screens.
 * Persisted so a resized panel survives reloads. Clamped to 260–560 on drag.
 */
export const searchPanelWidthAtom = atomWithStorage<number>(
  "timetable:searchPanelWidth",
  320,
);

/**
 * Whether the timetable product tour has already auto-started for this
 * browser. Set when a started tour ends (finish or dismiss).
 */
export const hasSeenTimetableTourAtom = atomWithStorage<boolean>(
  "hasSeenTimetableTour",
  false,
  undefined,
  { getOnInit: true },
);
