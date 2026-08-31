"use client";

import { useEffect } from "react";
import type { TourStep } from "./tour";
import { startTour } from "./tour";

/** Delay after mount before auto-starting, so anchors can render first. */
const AUTO_START_DELAY_MS = 1200;

/**
 * Auto-start a tour once per browser, a short delay after mount.
 *
 * Does nothing when `hasSeen` is already true, and leaves the flag unset
 * when no anchor elements exist (logged out / empty states) so the tour can
 * still run on a later visit. `onDone` fires whenever a started tour ends.
 */
export function useAutoStartTour(
  steps: TourStep[],
  opts: { hasSeen: boolean; onDone: () => void },
): void {
  const { hasSeen, onDone } = opts;

  useEffect(() => {
    if (hasSeen) return undefined;
    const timeoutId = setTimeout(() => {
      void startTour(steps, { onDestroyed: onDone });
    }, AUTO_START_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [hasSeen, onDone, steps]);
}
