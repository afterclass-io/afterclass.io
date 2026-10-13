import { describe, expect, it } from "vitest";
import { ReviewReactionType } from "@/generated/prisma/enums";
import { updateReactionCounts, type ReactionCount } from "./reactions";

const A = ReviewReactionType.LIKE;
const B = ReviewReactionType.SLAY;
const C = ReviewReactionType.FUNNY;

describe("updateReactionCounts", () => {
  it("appends a first reaction with a count of 1", () => {
    expect(updateReactionCounts([], null, A)).toEqual([
      { reaction: A, count: 1 },
    ]);
  });

  it("increments an existing reaction in place", () => {
    const counts = [
      { reaction: A, count: 2 },
      { reaction: B, count: 1 },
    ];
    expect(updateReactionCounts(counts, null, A)).toEqual([
      { reaction: A, count: 3 },
      { reaction: B, count: 1 },
    ]);
  });

  it("removes a reaction when its count reaches 0", () => {
    const counts = [
      { reaction: A, count: 1 },
      { reaction: B, count: 4 },
    ];
    expect(updateReactionCounts(counts, A, null)).toEqual([
      { reaction: B, count: 4 },
    ]);
  });

  it("decrements without removing while the count stays above 0", () => {
    expect(updateReactionCounts([{ reaction: A, count: 3 }], A, null)).toEqual([
      { reaction: A, count: 2 },
    ]);
  });

  it("switches the viewer's reaction", () => {
    const counts = [
      { reaction: A, count: 1 },
      { reaction: B, count: 2 },
    ];
    expect(updateReactionCounts(counts, A, B)).toEqual([
      { reaction: B, count: 3 },
    ]);
    expect(updateReactionCounts(counts, B, C)).toEqual([
      { reaction: A, count: 1 },
      { reaction: B, count: 1 },
      { reaction: C, count: 1 },
    ]);
  });

  it("treats undefined like null", () => {
    expect(updateReactionCounts([], undefined, A)).toEqual([
      { reaction: A, count: 1 },
    ]);
    expect(
      updateReactionCounts([{ reaction: A, count: 2 }], A, undefined),
    ).toEqual([{ reaction: A, count: 1 }]);
  });

  it("returns equal counts when the reaction does not change", () => {
    const counts = [{ reaction: A, count: 1 }];
    expect(updateReactionCounts(counts, A, A)).toEqual(counts);
    expect(updateReactionCounts(counts, null, null)).toEqual(counts);
  });

  it("does not mutate its input", () => {
    const counts: ReactionCount[] = Object.freeze([
      Object.freeze({ reaction: A, count: 1 }),
    ]) as unknown as ReactionCount[];
    expect(() => updateReactionCounts(counts, A, B)).not.toThrow();
  });
});
