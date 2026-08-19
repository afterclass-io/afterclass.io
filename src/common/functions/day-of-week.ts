/** Canonical 3-letter uppercase day codes. */
const NORMALIZE_MAP: Record<string, string> = {
  MON: "MON",
  MONDAY: "MON",
  TUE: "TUE",
  TUES: "TUE",
  TUESDAY: "TUE",
  WED: "WED",
  WEDNESDAY: "WED",
  THU: "THU",
  THUR: "THU",
  THURS: "THU",
  THURSDAY: "THU",
  FRI: "FRI",
  FRIDAY: "FRI",
  SAT: "SAT",
  SATURDAY: "SAT",
  SUN: "SUN",
  SUNDAY: "SUN",
};

export function normalizeDayOfWeek(
  day: string | null | undefined,
): string | null {
  if (!day) return null;
  const u = day.trim().toUpperCase();
  return NORMALIZE_MAP[u] ?? null;
}

const NUMBER_MAP: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export function dayOfWeekToNumber(
  day: string | null | undefined,
): number | null {
  const norm = normalizeDayOfWeek(day);
  if (!norm) return null;
  return NUMBER_MAP[norm] ?? null;
}

const ICAL_MAP: Record<string, string> = {
  MON: "MO",
  TUE: "TU",
  WED: "WE",
  THU: "TH",
  FRI: "FR",
  SAT: "SA",
  SUN: "SU",
};

export function dayOfWeekToIcalCode(
  day: string | null | undefined,
): string | null {
  const norm = normalizeDayOfWeek(day);
  if (!norm) return null;
  return ICAL_MAP[norm] ?? null;
}

/** Display label for JS day-of-week numbers 1..5 (Mon–Fri) — the grid's header labels. */
export const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
};
