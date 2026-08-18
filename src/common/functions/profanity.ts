/**
 * Display-time profanity filter for public-facing text, backed by the
 * `obscenity` library's English dataset.
 *
 * afterclass has no real censorship mechanism; this masks profanity with
 * asterisks when rendering user-generated content (roadmap names,
 * descriptions, usernames) to the public. It is intentionally simple — a
 * stopgap, not a substitute for a proper moderation pipeline.
 *
 * Pure function — no side effects; matcher and censor are compiled once at
 * module load.
 */

import {
  RegExpMatcher,
  TextCensor,
  asteriskCensorStrategy,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

// English blacklist with recommended transformers (case, confusables like
// leetspeak). Matches are whole-word aware, so substrings inside innocent
// words (the "Scunthorpe problem") are left alone.
const MATCHER = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// Mask each matched character with an asterisk (same length as the word).
const CENSOR = new TextCensor().setStrategy(asteriskCensorStrategy());

/**
 * Mask profanity in `text` with asterisks (same length as the word),
 * preserving the rest of the string. Returns the input unchanged when it
 * contains nothing blocked.
 */
export function censorProfanity(text: string): string {
  return CENSOR.applyTo(text, MATCHER.getAllMatches(text));
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
