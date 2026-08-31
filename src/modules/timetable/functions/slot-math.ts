/**
 * Pure timetable slot-layout math, transposed for a vertical grid.
 *
 * Ported from smu-mods `getRowAssignment` but rotated 90°:
 *   - smu-mods (horizontal): rows = sub-rows, left/width positioning
 *   - afterclass.io (vertical):   sub-columns, top/height positioning
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 */
import { timeToMinutes, parseTimePartsSafe } from "@/common/functions/time";
import { dayOfWeekToNumber } from "@/common/functions/day-of-week";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Earliest visible time (08:00) in minutes since midnight. */
export const GRID_START_MIN = 480;

/** Latest visible time (22:15) in minutes since midnight. */
export const GRID_END_MIN = 1335;

/** Total visible range in minutes. */
const GRID_RANGE_MIN = GRID_END_MIN - GRID_START_MIN; // 855

/**
 * The four standard SMU class periods (roughly aligned with the real SMU
 * bell times). Used to render period bands and labels on the timetable axis.
 */
export const SMU_PERIODS: {
  label: string;
  startMin: number;
  endMin: number;
}[] = [
  { label: "08:15–11:30", startMin: 495, endMin: 690 },
  { label: "12:00–15:15", startMin: 720, endMin: 915 },
  { label: "15:30–18:45", startMin: 930, endMin: 1125 },
  { label: "19:00–22:15", startMin: 1140, endMin: 1335 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClassTimingLike = {
  dayOfWeek?: string | null;
  startTime: string;
  endTime: string;
  venue?: string | null;
};

export type PositionedSlot = {
  timing: ClassTimingLike;
  /** Percentage from top of grid (0–100). */
  topPct: number;
  /** Percentage height (0–100). */
  heightPct: number;
  /** 0-based sub-column index within the overlap group. */
  colIndex: number;
  /** Total sub-columns for this slot's overlap group. */
  colCount: number;
  /**
   * Index into the ORIGINAL (pre-sort, pre-filter) input array.
   * Callers MUST re-associate results via this index rather than
   * array position, because layoutDay internally sorts and may drop
   * slots entirely outside the grid.
   */
  rawIndex: number;
};

// ---------------------------------------------------------------------------
// timeToMinutes (re-exported from shared util)
// ---------------------------------------------------------------------------

export { timeToMinutes };

// ---------------------------------------------------------------------------
// Time-conflict math (pure)
// ---------------------------------------------------------------------------

/** A class timing normalized to minutes-since-midnight for conflict checks. */
export type TimingLike = {
  dayOfWeek: number;
  startTime: number;
  endTime: number;
};

/** True when two same-day timings overlap (adjacent end==start does not). */
export function timingsOverlap(a: TimingLike, b: TimingLike): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * True when the candidate class clashes with any existing slot on the grid.
 * `existing`/`candidate` carry already-normalized `TimingLike` rows — feed
 * them through {@link toTimingLikes} first.
 */
export function hasTimeConflict(
  existing: readonly { classTimings: readonly TimingLike[] }[],
  candidate: { classTimings: readonly TimingLike[] },
): boolean {
  return existing.some((slot) =>
    slot.classTimings.some((t) => candidate.classTimings.some((c) => timingsOverlap(t, c))),
  );
}

/**
 * Normalize `ClassTimingLike` rows (string day + HH:MM times) into
 * minutes-since-midnight `TimingLike` rows. Rows with an unparseable day or
 * time are dropped — they can never conflict.
 */
export function toTimingLikes(timings: readonly ClassTimingLike[]): TimingLike[] {
  const out: TimingLike[] = [];
  for (const t of timings) {
    const dayOfWeek = dayOfWeekToNumber(t.dayOfWeek);
    const start = parseTimePartsSafe(t.startTime);
    const end = parseTimePartsSafe(t.endTime);
    if (dayOfWeek == null || !start || !end) {
      if (process.env.NODE_ENV !== "production") console.warn("[slot-math] dropped timing", t);
      continue;
    }
    out.push({
      dayOfWeek,
      startTime: start[0] * 60 + start[1],
      endTime: end[0] * 60 + end[1],
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Clamp a minute value into [GRID_START_MIN, GRID_END_MIN]. */
function clampToGrid(minutes: number): number {
  return Math.max(GRID_START_MIN, Math.min(GRID_END_MIN, minutes));
}

/** Convert clamped minutes to a 0–100 percentage of the grid range. */
function minutesToPct(minutes: number): number {
  return ((clampToGrid(minutes) - GRID_START_MIN) / GRID_RANGE_MIN) * 100;
}

/**
 * Absolute top/height (as percentages) of a time band within the visible
 * grid, e.g. one SMU class period. `top`/`height` are ready to spread into a
 * component's `style` prop.
 */
export function periodBandStyle(p: { startMin: number; endMin: number }) {
  const range = GRID_END_MIN - GRID_START_MIN;
  return {
    top: `${((p.startMin - GRID_START_MIN) / range) * 100}%`,
    height: `${((p.endMin - p.startMin) / range) * 100}%`,
  };
}

// ---------------------------------------------------------------------------
// layoutDay
// ---------------------------------------------------------------------------

/**
 * Pack a single day's ClassTiming rows into positioned vertical slots.
 *
 * Algorithm (transposed from smu-mods `getRowAssignment`):
 * 1. Filter out slots entirely outside the grid range.
 * 2. Sort by start time.
 * 3. Partition into connected overlap components.
 * 4. Within each component, assign each slot to the first sub-column (lane)
 *    whose last slot does not overlap it. Add a new lane if needed.
 * 5. Every slot in a component shares that component's `colCount` (lane count).
 */
export function layoutDay(timings: ClassTimingLike[]): PositionedSlot[] {
  // --- Step 0: edge case ---
  if (timings.length === 0) return [];

  // --- Step 1: parse & filter ---
  const parsed = timings
    .map((t, rawIndex) => ({
      timing: t,
      rawIndex,
      startMin: timeToMinutes(t.startTime),
      endMin: timeToMinutes(t.endTime),
    }))
    // Filter out slots entirely outside the visible grid
    .filter((s) => s.endMin > GRID_START_MIN && s.startMin < GRID_END_MIN);

  if (parsed.length === 0) return [];

  // --- Step 2: sort by start time ---
  parsed.sort((a, b) => a.startMin - b.startMin);

  // --- Step 3: partition into connected overlap components ---
  const components: (typeof parsed)[] = [];
  let currentComponent: typeof parsed = [];
  let componentEndMax = 0;

  for (const slot of parsed) {
    if (slot.startMin >= componentEndMax) {
      // Gap: start a new component
      if (currentComponent.length > 0) components.push(currentComponent);
      currentComponent = [];
      componentEndMax = 0;
    }
    currentComponent.push(slot);
    componentEndMax = Math.max(componentEndMax, slot.endMin);
  }
  if (currentComponent.length > 0) components.push(currentComponent);

  // --- Step 4 & 5: lane assignment per component ---
  const results: PositionedSlot[] = [];

  for (const comp of components) {
    // Lanes: each lane is an array of (startMin, endMin) of placed slots
    const lanes: { startMin: number; endMin: number }[][] = [];
    // Map: index in comp → lane index
    const laneAssignment: number[] = [];

    for (const slot of comp) {
      const clampedStart = clampToGrid(slot.startMin);
      const clampedEnd = clampToGrid(slot.endMin);

      // Find first lane where the last slot ends before this slot starts
      let assignedLane = -1;
      for (let li = 0; li < lanes.length; li++) {
        const lastInLane = lanes[li]![lanes[li]!.length - 1];
        if (lastInLane && lastInLane.endMin <= clampedStart) {
          assignedLane = li;
          break;
        }
      }

      if (assignedLane === -1) {
        // Need a new lane
        assignedLane = lanes.length;
        lanes.push([]);
      }

      lanes[assignedLane]!.push({
        startMin: clampedStart,
        endMin: clampedEnd,
      });
      laneAssignment.push(assignedLane);
    }

    const colCount = lanes.length;

    for (let i = 0; i < comp.length; i++) {
      const slot = comp[i]!;
      const clampedStart = clampToGrid(slot.startMin);
      const clampedEnd = clampToGrid(slot.endMin);

      results.push({
        timing: slot.timing,
        rawIndex: slot.rawIndex,
        topPct: minutesToPct(clampedStart),
        heightPct: ((clampedEnd - clampedStart) / GRID_RANGE_MIN) * 100,
        colIndex: laneAssignment[i]!,
        colCount,
      });
    }
  }

  return results;
}
