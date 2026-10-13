import { describe, expect, it } from "vitest";

import { toOgRating, toOgStatItems } from "./ogFigures";

describe("toOgRating", () => {
  it("formats the average to two decimals when reviews exist", () => {
    expect(toOgRating(4.11, 9)).toBe("4.11");
    expect(toOgRating(4.5, 2)).toBe("4.50");
  });

  it("shows a dash instead of a rating when there are no reviews", () => {
    expect(toOgRating(0, 0)).toBe("-");
    expect(toOgRating(4.25, 0)).toBe("-");
  });
});

describe("toOgStatItems", () => {
  it("title-cases each label and formats its share of all reviews", () => {
    expect(
      toOgStatItems(
        [
          { name: "engaging", count: 3 },
          { name: "PRACTICAL workload", count: 0 },
        ],
        9,
      ),
    ).toEqual([
      { label: "Engaging", value: "33%" },
      { label: "Practical Workload", value: "0%" },
    ]);
  });

  it("shows 100% when every review cites the label", () => {
    expect(toOgStatItems([{ name: "engaging", count: 4 }], 4)).toEqual([
      { label: "Engaging", value: "100%" },
    ]);
  });

  it("returns no items when no label was cited", () => {
    expect(toOgStatItems([], 0)).toEqual([]);
  });
});
