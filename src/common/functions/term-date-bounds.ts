/**
 * Pure helpers for keeping a date window inside an academic term. All dates are
 * `YYYY-MM-DD` strings so the math is timezone-free; term bounds (stored as
 * timestamps) are reduced to their UTC calendar day, matching how date-only
 * columns such as `meeting_polls.start_date` are persisted.
 */

export type IsoDateRange = { start: string; end: string };
export type TermWindow = { startDt: Date | string; endDt: Date | string };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoToUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/** UTC calendar day of a Date/ISO timestamp as `YYYY-MM-DD`. */
export function toIsoDate(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Today's calendar day in Singapore (UTC+8, no DST) as `YYYY-MM-DD`. */
export function todayIsoSGT(now: Date = new Date()): string {
  return toIsoDate(new Date(now.getTime() + SGT_OFFSET_MS));
}

export function addDaysIso(iso: string, days: number): string {
  return toIsoDate(new Date(isoToUtcMs(iso) + days * MS_PER_DAY));
}

/** Inclusive number of calendar days in the range. */
export function countDaysInclusive(range: IsoDateRange): number {
  return Math.round((isoToUtcMs(range.end) - isoToUtcMs(range.start)) / MS_PER_DAY) + 1;
}

export function termDateWindow(term: TermWindow): IsoDateRange {
  return { start: toIsoDate(term.startDt), end: toIsoDate(term.endDt) };
}

export function isWithinTerm(range: IsoDateRange, term: TermWindow): boolean {
  const window = termDateWindow(term);
  return range.start >= window.start && range.end <= window.end;
}

/** Shifts and trims a range so it lies inside the term, keeping its length when possible. */
export function clampRangeToTerm(
  range: IsoDateRange,
  term: TermWindow,
): IsoDateRange {
  const window = termDateWindow(term);
  const start = range.start < window.start ? window.start : range.start;
  const boundedStart = start > window.end ? window.end : start;
  const end = range.end > window.end ? window.end : range.end;
  return { start: boundedStart, end: end < boundedStart ? boundedStart : end };
}

/** Default poll window: `days` long, starting today (or the term start if it has not begun). */
export function defaultRangeInTerm(
  todayIso: string,
  term: TermWindow,
  days: number,
): IsoDateRange {
  const { start } = clampRangeToTerm({ start: todayIso, end: todayIso }, term);
  return clampRangeToTerm({ start, end: addDaysIso(start, days - 1) }, term);
}
