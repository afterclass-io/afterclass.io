/**
 * Maximum value the rating input offers - the declared 1-to-N scale.
 *
 * Defined here rather than inside `rating-group.tsx` because that file is
 * `"use client"`: a primitive imported from a client module into the server
 * graph becomes a client reference and silently drops out of `JSON.stringify`.
 * The structured-data builders are server-side and declare this as
 * `bestRating`, so they need the real number.
 */
export const DEFAULT_MAX_RATING = 5;
