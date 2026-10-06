// Pure slot math utilities for the 15-minute meeting matrix grid.
// All functions are pure and deterministic without external state.
// Uses column-major ordering: Day 0 contains slots [0 .. slotsPerDay - 1],
// Day 1 contains [slotsPerDay .. 2 * slotsPerDay - 1], etc.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes a Date or string to a local Date representing year/month/day at midnight.
 */
export function normalizeDate(d: Date | string): Date {
  if (typeof d === "string") {
    const datePart = d.split("T")[0]!;
    const parts = datePart.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }
  }
  const dateObj = typeof d === "string" ? new Date(d) : d;
  return new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Calculates calendar day difference (target - start).
 */
export function getDaysDiff(target: Date, start: Date): number {
  const tNorm = normalizeDate(target);
  const sNorm = normalizeDate(start);
  const tUtc = Date.UTC(tNorm.getFullYear(), tNorm.getMonth(), tNorm.getDate());
  const sUtc = Date.UTC(sNorm.getFullYear(), sNorm.getMonth(), sNorm.getDate());
  return Math.round((tUtc - sUtc) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Core Matrix Functions
// ---------------------------------------------------------------------------

/**
 * Generates an array of Date objects for each calendar day from startDate to endDate (inclusive).
 * Returns an empty array if startDate > endDate.
 */
export function generateDateRange(
  startDate: string | Date,
  endDate: string | Date,
): Date[] {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (start.getTime() > end.getTime()) {
    return [];
  }

  const days: Date[] = [];
  const current = new Date(start);

  while (current.getTime() <= end.getTime()) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Generates formatted "HH:MM" time slot strings from startHour to endHour (exclusive)
 * in steps of slotMinutes.
 *
 * Example: generateTimeSlots(8, 10, 15) ->
 * ["08:00", "08:15", "08:30", "08:45", "09:00", "09:15", "09:30", "09:45"]
 */
export function generateTimeSlots(
  startHour: number,
  endHour: number,
  slotMinutes = 15,
): string[] {
  if (startHour >= endHour || slotMinutes <= 0) {
    return [];
  }

  const slots: string[] = [];
  const totalMinutes = (endHour - startHour) * 60;

  for (let min = 0; min < totalMinutes; min += slotMinutes) {
    const h = startHour + Math.floor(min / 60);
    const m = min % 60;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return slots;
}

/**
 * Converts a linear slot index to its concrete Date and "HH:MM" time string.
 *
 * Column-major ordering:
 * Day 0 has slots [0 .. slotsPerDay - 1]
 * Day 1 has slots [slotsPerDay .. 2*slotsPerDay - 1]
 */
export function slotIndexToDateTime(
  slotIndex: number,
  startDate: Date | string,
  startHour: number,
  endHour: number,
  slotMinutes = 15,
): { date: Date; timeStr: string } {
  if (slotIndex < 0) {
    throw new Error("slotIndex must be non-negative");
  }

  const slotsPerHour = Math.floor(60 / slotMinutes);
  const slotsPerDay = (endHour - startHour) * slotsPerHour;
  if (slotsPerDay <= 0) {
    throw new Error("Invalid startHour, endHour, or slotMinutes");
  }

  const dayOffset = Math.floor(slotIndex / slotsPerDay);
  const slotInDay = slotIndex % slotsPerDay;

  const minutesFromStart = slotInDay * slotMinutes;
  const hour = startHour + Math.floor(minutesFromStart / 60);
  const minute = minutesFromStart % 60;

  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const base = normalizeDate(startDate);
  const date = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + dayOffset,
    hour,
    minute,
    0,
    0,
  );

  return { date, timeStr };
}

/**
 * Converts a target Date back to its linear slot index within a meeting poll window.
 * Returns `null` if the target is before startDate or outside the daily [startHour, endHour) window.
 */
export function dateTimeToSlotIndex(
  target: Date,
  startDate: Date | string,
  startHour: number,
  endHour: number,
  slotMinutes = 15,
): number | null {
  const base = normalizeDate(startDate);
  const dayOffset = getDaysDiff(target, base);

  if (dayOffset < 0) {
    return null;
  }

  const slotsPerHour = Math.floor(60 / slotMinutes);
  const slotsPerDay = (endHour - startHour) * slotsPerHour;
  if (slotsPerDay <= 0) {
    return null;
  }

  const targetMinutes = target.getHours() * 60 + target.getMinutes();
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  if (targetMinutes < startMinutes || targetMinutes >= endMinutes) {
    return null;
  }

  const minutesFromDayStart = targetMinutes - startMinutes;
  const slotInDay = Math.floor(minutesFromDayStart / slotMinutes);

  return dayOffset * slotsPerDay + slotInDay;
}

/**
 * Calculates total number of slots in a meeting window.
 */
export function getTotalSlots(
  startDate: Date | string,
  endDate: Date | string,
  startHour: number,
  endHour: number,
  slotMinutes = 15,
): number {
  const dates = generateDateRange(startDate, endDate);
  const slotsPerHour = Math.floor(60 / slotMinutes);
  const slotsPerDay = (endHour - startHour) * slotsPerHour;
  return dates.length * Math.max(0, slotsPerDay);
}

// ---------------------------------------------------------------------------
// Heatmap Math
// ---------------------------------------------------------------------------

/**
 * Calculates availability ratio (0.0 to 1.0) for a slot.
 * Standard ratio: (availableCount + 0.5 * ifNeededCount) / totalParticipants
 * If hideIfNeeded is true: availableCount / totalParticipants
 */
export function calculateHeatmapRatio(
  availableCount: number,
  ifNeededCount: number,
  totalParticipants: number,
  hideIfNeeded = false,
): number {
  if (totalParticipants <= 0) {
    return 0;
  }

  const effectiveAvailable = hideIfNeeded
    ? availableCount
    : availableCount + 0.5 * ifNeededCount;

  const ratio = effectiveAvailable / totalParticipants;
  return Math.min(1, Math.max(0, ratio));
}

/**
 * Returns dynamic background color style for a heatmap cell based on availability ratio.
 */
export function getHeatmapBackgroundColor(ratio: number): string {
  if (ratio <= 0) return "transparent";
  // Strength scales from 15% to 95% of the meetings "available" green.
  const percent = Math.round((0.15 + 0.8 * ratio) * 100);
  return `color-mix(in srgb, var(--mt-available) ${percent}%, transparent)`;
}

/**
 * Formats a Date to "YYYY-MM-DD" local string for date inputs and comparisons.
 */
export function formatDateToISO(d: Date | string): string {
  const norm = normalizeDate(d);
  const y = norm.getFullYear();
  const m = String(norm.getMonth() + 1).padStart(2, "0");
  const day = String(norm.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

