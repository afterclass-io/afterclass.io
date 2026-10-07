import type { SlotRange } from "@/modules/meetings/functions/slot-runs";
import {
  formatDateToISO,
  slotIndexToDateTime,
} from "@/modules/meetings/utils/matrix";

export type PollWindow = {
  startDate: Date | string;
  startHour: number;
  endHour: number;
  slotMinutes: number;
};

/** Absolute start and end instants of a slot range; poll hours are Singapore time. */
export function slotRangeToInstants(
  range: SlotRange,
  window: PollWindow,
): { start: Date; end: Date } {
  const toInstant = (slotIndex: number) => {
    const { date, timeStr } = slotIndexToDateTime(
      slotIndex,
      window.startDate,
      window.startHour,
      window.endHour,
      window.slotMinutes,
    );
    return new Date(`${formatDateToISO(date)}T${timeStr}:00+08:00`);
  };

  const start = toInstant(range.start);
  const end = new Date(
    toInstant(range.end).getTime() + window.slotMinutes * 60 * 1000,
  );
  return { start, end };
}

type RangeParticipant = { availableSlots: number[]; ifNeededSlots: number[] };

/**
 * How many participants can attend the whole range: `free` are available for
 * every slot, `maybe` can make it but need "if needed" for at least one slot.
 */
export function summarizeRangeAvailability(
  participants: RangeParticipant[],
  range: SlotRange,
): { free: number; maybe: number; total: number } {
  let free = 0;
  let maybe = 0;

  for (const participant of participants) {
    const available = new Set(participant.availableSlots);
    const ifNeeded = new Set(participant.ifNeededSlots);
    let allFree = true;
    let allAttendable = true;

    for (let slot = range.start; slot <= range.end; slot++) {
      if (!available.has(slot)) allFree = false;
      if (!available.has(slot) && !ifNeeded.has(slot)) allAttendable = false;
    }

    if (allFree) free += 1;
    else if (allAttendable) maybe += 1;
  }

  return { free, maybe, total: participants.length };
}
