/** Longest date window a meeting poll can span, in days (inclusive). */
export const MAX_POLL_DAYS = 14;

/** Default window length offered when creating a poll. */
export const DEFAULT_POLL_DAYS = 5;

/** Window lengths offered as shortcuts in the date picker. */
export const POLL_DAY_PRESETS = [3, 5, 7, 14];

/** Slots per day at the standard 15-minute granularity. */
const SLOTS_PER_DAY = 24 * 4;

/** Largest valid slot index range for any poll: the longest window at full-day hours. */
export const MAX_POLL_SLOTS = MAX_POLL_DAYS * SLOTS_PER_DAY;

export const MAX_AGENDA_LENGTH = 2000;
export const MAX_MEETING_LINKS = 5;
export const MAX_LINK_LENGTH = 500;
