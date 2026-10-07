import {
  addDaysIso,
  countDaysInclusive,
  toIsoDate,
} from "@/common/functions/term-date-bounds";
import { groupSlotsIntoRuns } from "@/modules/meetings/functions/slot-runs";

export const SGT_TIMEZONE = "Asia/Singapore";
export const SGT_OFFSET_MINUTES = 480;

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type WeekdayLabel = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export const WEEKDAYS: readonly Weekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

const WEEKDAYS_ORDER: readonly Weekday[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const WEEKDAY_LABELS: Record<Weekday, WeekdayLabel> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** Poll geometry with dates as SGT calendar days. */
export type PollGrid = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD, inclusive
  startHour: number;
  endHour: number; // exclusive, 1..24
  slotMinutes: number;
};
export type PollDay = { date: string; weekday: WeekdayLabel };
export type SlotTime = { date: string; start: string; end: string }; // HH:MM SGT
export type AvailabilityStatus = "available" | "ifNeeded";
export type AvailabilityRange = SlotTime & { status: AvailabilityStatus };

export class SlotTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotTimeError";
  }
}

export function toPollGrid(poll: {
  startDate: Date | string;
  endDate: Date | string;
  startHour: number;
  endHour: number;
  slotDurationMinutes: number;
}): PollGrid {
  return {
    startDate: toIsoDate(poll.startDate),
    endDate: toIsoDate(poll.endDate),
    startHour: poll.startHour,
    endHour: poll.endHour,
    slotMinutes: poll.slotDurationMinutes,
  };
}

export function slotsPerDay(grid: PollGrid): number {
  return ((grid.endHour - grid.startHour) * 60) / grid.slotMinutes;
}

export function assertIsoDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new SlotTimeError(`Invalid date "${value}"; use YYYY-MM-DD.`);
  }
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms) || toIsoDate(new Date(ms)) !== value) {
    throw new SlotTimeError(`Invalid date "${value}"; use YYYY-MM-DD.`);
  }
}

export function weekdayOf(isoDate: string): Weekday {
  const dayIdx = new Date(Date.parse(`${isoDate}T00:00:00Z`)).getUTCDay();
  return WEEKDAYS_ORDER[dayIdx]!;
}

export function weekdayLabel(day: Weekday): WeekdayLabel {
  return WEEKDAY_LABELS[day];
}

export function pollDays(grid: PollGrid): PollDay[] {
  const count = countDaysInclusive({
    start: grid.startDate,
    end: grid.endDate,
  });
  const days: PollDay[] = [];
  for (let k = 0; k < count; k++) {
    const date = addDaysIso(grid.startDate, k);
    days.push({ date, weekday: weekdayLabel(weekdayOf(date)) });
  }
  return days;
}

export function totalSlots(grid: PollGrid): number {
  return pollDays(grid).length * slotsPerDay(grid);
}

export function parseHhmm(value: string): number {
  if (value === "24:00") {
    return 1440;
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new SlotTimeError(`Invalid time "${value}"; use HH:MM (24-hour, SGT).`);
  }
  const [hoursStr, minsStr] = value.split(":");
  return Number(hoursStr) * 60 + Number(minsStr);
}

export function formatHhmm(minutes: number): string {
  if (minutes === 1440) {
    return "24:00";
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function slotIndexToTime(grid: PollGrid, index: number): SlotTime {
  const total = totalSlots(grid);
  if (!Number.isInteger(index) || index < 0 || index >= total) {
    throw new SlotTimeError(`Slot ${index} is outside this poll.`);
  }
  const spd = slotsPerDay(grid);
  const dayIndex = Math.floor(index / spd);
  const slotInDay = index % spd;
  const date = addDaysIso(grid.startDate, dayIndex);
  const startMinutes = grid.startHour * 60 + slotInDay * grid.slotMinutes;
  const endMinutes = startMinutes + grid.slotMinutes;
  return {
    date,
    start: formatHhmm(startMinutes),
    end: formatHhmm(endMinutes),
  };
}

export function rangeToSlotIndices(
  grid: PollGrid,
  range: { date: string; start: string; end: string },
): number[] {
  assertIsoDate(range.date);
  if (range.date < grid.startDate || range.date > grid.endDate) {
    throw new SlotTimeError(
      `Date ${range.date} is outside the poll window ${grid.startDate} to ${grid.endDate}.`,
    );
  }

  const startMinutes = parseHhmm(range.start);
  const endMinutes = parseHhmm(range.end);

  if (endMinutes <= startMinutes) {
    throw new SlotTimeError(
      `Range ${range.start}-${range.end} on ${range.date} must end after it starts.`,
    );
  }

  if (startMinutes % grid.slotMinutes !== 0) {
    throw new SlotTimeError(
      `Time ${range.start} on ${range.date} is not on a ${grid.slotMinutes}-minute boundary.`,
    );
  }
  if (endMinutes % grid.slotMinutes !== 0) {
    throw new SlotTimeError(
      `Time ${range.end} on ${range.date} is not on a ${grid.slotMinutes}-minute boundary.`,
    );
  }

  const pollStartMinutes = grid.startHour * 60;
  const pollEndMinutes = grid.endHour * 60;
  if (startMinutes < pollStartMinutes || endMinutes > pollEndMinutes) {
    throw new SlotTimeError(
      `Time ${range.start}-${range.end} on ${range.date} is outside the poll hours ${formatHhmm(pollStartMinutes)}-${formatHhmm(pollEndMinutes)} SGT.`,
    );
  }

  const dayIndex = Math.round(
    (Date.parse(`${range.date}T00:00:00Z`) -
      Date.parse(`${grid.startDate}T00:00:00Z`)) /
      86400000,
  );
  const spd = slotsPerDay(grid);
  const dayOffset = dayIndex * spd;
  const startSlot = (startMinutes - pollStartMinutes) / grid.slotMinutes;
  const endSlot = (endMinutes - pollStartMinutes) / grid.slotMinutes;

  const result: number[] = [];
  for (let s = startSlot; s < endSlot; s++) {
    result.push(dayOffset + s);
  }
  return result;
}

export function slotIndicesToRanges(
  grid: PollGrid,
  indices: Iterable<number>,
): SlotTime[] {
  const total = totalSlots(grid);
  const spd = slotsPerDay(grid);
  const filtered: number[] = [];
  for (const idx of indices) {
    if (
      typeof idx === "number" &&
      Number.isInteger(idx) &&
      idx >= 0 &&
      idx < total
    ) {
      filtered.push(idx);
    }
  }

  const runs = groupSlotsIntoRuns(filtered, spd);
  return runs.map((run) => {
    const date = addDaysIso(grid.startDate, run.dayIndex);
    const startMinutes = grid.startHour * 60 + run.startSlot * grid.slotMinutes;
    const endMinutes = startMinutes + run.length * grid.slotMinutes;
    return {
      date,
      start: formatHhmm(startMinutes),
      end: formatHhmm(endMinutes),
    };
  });
}

export function availabilityToRanges(
  grid: PollGrid,
  slots: {
    availableSlots: readonly number[];
    ifNeededSlots: readonly number[];
  },
): AvailabilityRange[] {
  const availableSet = new Set(slots.availableSlots);
  const filteredIfNeeded = slots.ifNeededSlots.filter((s) => !availableSet.has(s));

  const availRanges: AvailabilityRange[] = slotIndicesToRanges(
    grid,
    slots.availableSlots,
  ).map((r) => ({ ...r, status: "available" as const }));

  const ifNeededRanges: AvailabilityRange[] = slotIndicesToRanges(
    grid,
    filteredIfNeeded,
  ).map((r) => ({ ...r, status: "ifNeeded" as const }));

  const combined = [...availRanges, ...ifNeededRanges];
  combined.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    if (a.start !== b.start) {
      return a.start < b.start ? -1 : 1;
    }
    return 0;
  });
  return combined;
}

export function slotStartUtcMs(grid: PollGrid, index: number): number {
  const spd = slotsPerDay(grid);
  const dayIndex = Math.floor(index / spd);
  const slotInDay = index % spd;
  const date = addDaysIso(grid.startDate, dayIndex);
  const minuteOfDay = grid.startHour * 60 + slotInDay * grid.slotMinutes;
  return (
    Date.parse(`${date}T00:00:00Z`) +
    (minuteOfDay - SGT_OFFSET_MINUTES) * 60_000
  );
}

export function formatSgtIso(now: Date): string {
  return `${new Date(now.getTime() + SGT_OFFSET_MINUTES * 60_000).toISOString().slice(0, 19)}+08:00`;
}
