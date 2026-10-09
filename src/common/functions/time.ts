/** Parse "HH:MM" to minutes since midnight. Strict; throws on invalid input. */
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

/** Permissive parse of "HH:MM" or "HH:MM:SS" into [hours, minutes] (seconds ignored). */
export function parseTimeParts(t: string): [number, number] {
  const parts = t.split(":").map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0];
}

/**
 * Safe wrapper around {@link parseTimeParts} that rejects invalid time parts.
 *
 * Returns `null` when the parsed hours/minutes would produce an invalid
 * `Date` (NaN, hours outside 0–23, minutes outside 0–59). Use this in
 * contexts like iCal generation where a broken date is worse than a
 * skipped event.
 */
export function parseTimePartsSafe(t: string): [number, number] | null {
  const [h, m] = parseTimeParts(t);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return [h, m];
}
