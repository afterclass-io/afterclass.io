import type { ReviewReactionType } from "@/generated/prisma/enums";

export type ReactionCount = { reaction: ReviewReactionType; count: number };

/**
 * Moves one viewer's reaction in a count list from `previous` to `next`.
 * `null` or `undefined` means "no reaction". Counts that reach 0 are
 * removed. A new reaction is appended with a count of 1. Returns the same
 * list when the reaction does not change. The input is never mutated.
 */
export function updateReactionCounts(
  counts: readonly ReactionCount[],
  previous: ReviewReactionType | null | undefined,
  next: ReviewReactionType | null | undefined,
): ReactionCount[] {
  const from = previous ?? null;
  const to = next ?? null;
  if (from === to) return [...counts];

  const afterRemove = from
    ? counts
        .map((c) => (c.reaction === from ? { ...c, count: c.count - 1 } : c))
        .filter((c) => c.count > 0)
    : [...counts];
  if (!to) return afterRemove;

  return afterRemove.some((c) => c.reaction === to)
    ? afterRemove.map((c) =>
        c.reaction === to ? { ...c, count: c.count + 1 } : c,
      )
    : [...afterRemove, { reaction: to, count: 1 }];
}
