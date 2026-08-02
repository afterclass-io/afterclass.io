"use client";

import { useEffect, useState } from "react";
import { cn } from "@/common/functions";
import { GRID_START_MIN, GRID_END_MIN } from "@/modules/timetable/functions/slot-math";

const GRID_RANGE_MIN = GRID_END_MIN - GRID_START_MIN;

/**
 * Returns the current time in Singapore (SGT, UTC+8) as minutes since midnight.
 */
function getSGTMinutes(): number {
  const now = new Date();
  // Convert to SGT by building a UTC timestamp and adding 8 hours
  const utcMinutes =
    now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + 8 * 60) % (24 * 60);
}

/**
 * Whether the given minute-of-day falls within the visible grid window.
 */
function isWithinGrid(minutes: number): boolean {
  return minutes >= GRID_START_MIN && minutes < GRID_END_MIN;
}

/**
 * Calculates the vertical position as a percentage (0–100) of the grid's
 * visible range (08:00–22:00).
 */
function minutesToPositionPct(minutes: number): number {
  const clamped = Math.max(GRID_START_MIN, Math.min(GRID_END_MIN, minutes));
  return ((clamped - GRID_START_MIN) / GRID_RANGE_MIN) * 100;
}

export type CurrentTimeIndicatorProps = {
  /** Whether the indicator should be shown at all. */
  highlightNow?: boolean;
};

/**
 * A horizontal line displaying the current SGT time on the timetable grid.
 *
 * Updates every 60 seconds.  Only renders when `highlightNow` is true and
 * the current SGT time is within 08:00–22:00.
 */
export function CurrentTimeIndicator({
  highlightNow = false,
}: CurrentTimeIndicatorProps) {
  const [, setTick] = useState(0);

  // Re-render every 60 s so the line moves with real time
  useEffect(() => {
    if (!highlightNow) return;

    const interval = setInterval(() => {
      setTick((n) => n + 1);
    }, 60_000);

    return () => clearInterval(interval);
  }, [highlightNow]);

  if (!highlightNow) return null;

  const nowMin = getSGTMinutes();
  if (!isWithinGrid(nowMin)) return null;

  const topPct = minutesToPositionPct(nowMin);

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
      style={{ top: `${topPct}%` }}
    >
      {/* Dot on the left side */}
      <div
        className={cn(
          "absolute -left-1.5 size-3 rounded-full bg-primary shadow-md",
        )}
      />
      {/* Horizontal line */}
      <div className="h-px w-full bg-primary" />
    </div>
  );
}
