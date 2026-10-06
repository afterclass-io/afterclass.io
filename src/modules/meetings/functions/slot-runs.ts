/** A contiguous block of slots inside a single day column. */
export type SlotRun = {
  dayIndex: number;
  /** First slot of the run, counted from the top of the day column. */
  startSlot: number;
  length: number;
};

/** Inclusive range of linear slot indices that lies within one day column. */
export type SlotRange = { start: number; end: number };

/**
 * Groups slot indices into contiguous per-day runs. A run never spans a day
 * boundary, even when the last slot of one day and the first slot of the next
 * are numerically adjacent.
 */
export function groupSlotsIntoRuns(
  slotIndices: Iterable<number>,
  slotsPerDay: number,
): SlotRun[] {
  if (slotsPerDay <= 0) return [];

  const sorted = [...new Set(slotIndices)].sort((a, b) => a - b);
  const runs: SlotRun[] = [];
  let previous: number | null = null;

  for (const slot of sorted) {
    const dayIndex = Math.floor(slot / slotsPerDay);
    const last = runs.at(-1);
    const continuesRun =
      last !== undefined &&
      previous === slot - 1 &&
      dayIndex === last.dayIndex;

    if (continuesRun) {
      last.length += 1;
    } else {
      runs.push({ dayIndex, startSlot: slot % slotsPerDay, length: 1 });
    }
    previous = slot;
  }

  return runs;
}

/**
 * Range from the drag anchor to the slot under the pointer, kept inside the
 * anchor's day column and ordered start <= end.
 */
export function dragSelectionRange(
  anchor: number,
  current: number,
  slotsPerDay: number,
): SlotRange {
  const dayStart = Math.floor(anchor / slotsPerDay) * slotsPerDay;
  const dayEnd = dayStart + slotsPerDay - 1;
  const bounded = Math.min(Math.max(current, dayStart), dayEnd);
  return { start: Math.min(anchor, bounded), end: Math.max(anchor, bounded) };
}

/**
 * Slots crossed when the pointer jumps from `from` to `to` within one day
 * column (excluding `from`, including `to`), so fast drags leave no gaps. A jump
 * across day columns only yields `to`.
 */
export function slotsBetween(
  from: number,
  to: number,
  slotsPerDay: number,
): number[] {
  if (Math.floor(from / slotsPerDay) !== Math.floor(to / slotsPerDay)) {
    return [to];
  }
  const step = to >= from ? 1 : -1;
  const slots: number[] = [];
  for (let slot = from + step; slot !== to + step; slot += step) {
    slots.push(slot);
  }
  return slots;
}
