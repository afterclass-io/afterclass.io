/**
 * Placeholder-level display-time profanity filter for public-facing text.
 *
 * afterclass has no real censorship mechanism; this is a minimal hardcoded
 * list of obvious English slurs/profanity, masked with asterisks when
 * rendering user-generated content (roadmap names, descriptions, usernames)
 * to the public. It is intentionally small — a stopgap, not a substitute
 * for a proper moderation pipeline.
 *
 * Pure function — no side effects, no dependencies beyond stdlib.
 */

/** Short hardcoded list of obvious English slurs/profanity. */
const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "cunt",
  "dick",
  "nigger",
  "faggot",
  "whore",
  "slut",
  "bastard",
  "retard",
] as const;

// Word-boundary, case-insensitive; compiled once at module load.
const BLOCKED_PATTERN = new RegExp(
  `\\b(?:${BLOCKED_WORDS.join("|")})\\b`,
  "gi",
);

/**
 * Mask blocked words in `text` with asterisks (same length as the word),
 * preserving the rest of the string. Returns the input unchanged when it
 * contains nothing blocked.
 */
export function censorProfanity(text: string): string {
  return text.replace(BLOCKED_PATTERN, (word) => "*".repeat(word.length));
}

/**
 * Convenience for nullable text: null/undefined pass through as-is.
 */
export function censorProfanityOrNull(
  text: string | null | undefined,
): string | null {
  if (text === null || text === undefined) return null;
  return censorProfanity(text);
}
