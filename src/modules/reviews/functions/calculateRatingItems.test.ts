import { describe, expect, it } from "vitest";
import type { Labels } from "@/generated/prisma/client";
import type { Review } from "@/modules/reviews/types";
import calculateRatingItems from "./calculateRatingItems";

/** A review carrying only the label names this function reads. */
const review = (...labelNames: string[]): Review =>
  ({
    reviewLabels: labelNames.map((name) => ({ name })),
  }) as unknown as Review;

const label = (name: string): Labels => ({ name }) as unknown as Labels;

describe("calculateRatingItems", () => {
  it("reports the share of reviews carrying each label as a percentage", () => {
    const reviews = [
      review("WELL_STRUCTURED"),
      review("WELL_STRUCTURED"),
      review(),
      review(),
    ];
    expect(calculateRatingItems(reviews, [label("WELL_STRUCTURED")])).toEqual([
      { label: "well structured", rating: "50%" },
    ]);
  });

  it("computes each label independently", () => {
    const reviews = [review("A", "B"), review("A"), review("A"), review()];
    expect(calculateRatingItems(reviews, [label("A"), label("B")])).toEqual([
      { label: "a", rating: "75%" },
      { label: "b", rating: "25%" },
    ]);
  });

  it("humanises the label name (underscores to spaces, lower-cased)", () => {
    expect(
      calculateRatingItems(
        [review("VERY_GOOD_COURSE")],
        [label("VERY_GOOD_COURSE")],
      ),
    ).toEqual([{ label: "very good course", rating: "100%" }]);
  });

  it("returns [] when there are no labels", () => {
    expect(calculateRatingItems([review("A")], [])).toEqual([]);
  });

  it("yields '0%' for an empty review list", () => {
    expect(calculateRatingItems([], [label("X")])).toEqual([
      { label: "x", rating: "0%" },
    ]);
  });
});
