/**
 * Shared day normalization (Mon–Sun display form).
 *
 * ONE contract for both current call sites (`views/timetable/view.tsx` and
 * `views/course-search/view.tsx`):
 * - Trims + uppercases the input, maps known day spellings to "Mon".."Sun".
 * - Unknown (unrecognized) input → `null`. Never passes raw text through:
 *   callers that need a raw fallback (course-search's timing line) apply the
 *   fallback themselves via `?? raw`.
 */

/** Canonical Mon–Sun display labels. */
export const DAY_ORDER = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export type DayLabel = (typeof DAY_ORDER)[number];

const DAY_NORMALIZE: Record<string, DayLabel> = {
  MON: "Mon",
  MONDAY: "Mon",
  TUE: "Tue",
  TUES: "Tue",
  TUESDAY: "Tue",
  WED: "Wed",
  WEDNESDAY: "Wed",
  THU: "Thu",
  THUR: "Thu",
  THURS: "Thu",
  THURSDAY: "Thu",
  FRI: "Fri",
  FRIDAY: "Fri",
  SAT: "Sat",
  SATURDAY: "Sat",
  SUN: "Sun",
  SUNDAY: "Sun",
};

/**
 * Normalize any day casing (`MON`/`monday`/`Mon` → `Mon`).
 * Returns `null` for null/undefined/empty/unknown input (unknown→null).
 */
export function normalizeDay(day: string | null | undefined): DayLabel | null {
  if (!day) return null;
  return DAY_NORMALIZE[day.trim().toUpperCase()] ?? null;
}
