/**
 * Pure timetable slot-layout math, transposed for a vertical grid.
 *
 * Ported from smu-mods `getRowAssignment` but rotated 90°:
 *   - smu-mods (horizontal): rows = sub-rows, left/width positioning
 *   - afterclass.io (vertical):   sub-columns, top/height positioning
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Earliest visible time (08:00) in minutes since midnight. */
export const GRID_START_MIN = 480;

/** Latest visible time (22:00) in minutes since midnight. */
export const GRID_END_MIN = 1320;

/** Total visible range in minutes. */
const GRID_RANGE_MIN = GRID_END_MIN - GRID_START_MIN; // 840

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
};

// ---------------------------------------------------------------------------
// timeToMinutes
// ---------------------------------------------------------------------------

/**
 * Convert a "HH:MM" string to minutes since midnight.
 * Throws if the format is invalid.
 */
export function timeToMinutes(t: string): number {
  if (!t || typeof t !== "string") {
    throw new Error("Invalid time format, expected 'HH:MM'");
  }

  const parts = t.split(":");
  if (parts.length !== 2 || parts[0]!.length !== 2 || parts[1]!.length !== 2) {
    throw new Error("Invalid time format, expected 'HH:MM'");
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error("Invalid time format, expected 'HH:MM'");
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid time format, expected 'HH:MM'");
  }

  return hours * 60 + minutes;
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
    .map((t) => ({
      timing: t,
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
        topPct: minutesToPct(clampedStart),
        heightPct:
          ((clampedEnd - clampedStart) / GRID_RANGE_MIN) * 100,
        colIndex: laneAssignment[i]!,
        colCount,
      });
    }
  }

  return results;
}
