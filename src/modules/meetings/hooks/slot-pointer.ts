"use client";

import { useEffect } from "react";

/** Slot index of the grid cell under a screen point, or null when the point is outside the grid. */
export function slotIndexAtPoint(x: number, y: number): number | null {
  const cell = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-slot-index]");
  const index = Number(cell?.dataset.slotIndex);
  return cell?.dataset.slotIndex !== undefined && Number.isInteger(index)
    ? index
    : null;
}

/** Calls `onRelease` when any pointer or touch ends, even if it ends outside the grid. */
export function useReleaseListener(onRelease: () => void) {
  useEffect(() => {
    const events = ["pointerup", "pointercancel", "touchend", "touchcancel"];
    for (const event of events) window.addEventListener(event, onRelease);
    return () => {
      for (const event of events) window.removeEventListener(event, onRelease);
    };
  }, [onRelease]);
}
