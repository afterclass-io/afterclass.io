/**
 * Abbreviates well-known SMU venue names to save space on compact UI
 * surfaces (timetable slot card, section picker). Display-only — the raw
 * venue string stays unchanged in the database and exports.
 *
 * Replacements run longest-name-first so "Classroom" never matches inside
 * "Active Learning Classroom".
 */
const VENUE_ABBREVIATIONS: [pattern: RegExp, abbr: string][] = [
  [/Active Learning Classroom/g, "ALC"],
  [/Mochtar Riady Auditorium/g, "MRA"],
  [/Ngee Ann Kongsi Auditorium/g, "NAKA"],
  [/Seminar Room/g, "SR"],
  [/Classroom/g, "CR"],
];

export function abbreviateVenue(venue: string): string {
  return VENUE_ABBREVIATIONS.reduce(
    (result, [pattern, abbr]) => result.replace(pattern, abbr),
    venue,
  );
}
