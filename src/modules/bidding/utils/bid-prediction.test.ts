import { describe, expect, it } from "vitest";

import {
  computeRecommendedRange,
  filterSafetyFactors,
  multiplierAt,
  recommendedBid,
} from "./bid-prediction";

const FACTORS = [
  {
    acadTermId: "AY202627T1",
    predictionType: "MIN",
    multiplierType: "EMPIRICAL",
    beatsPercentage: 70,
    multiplier: 0.5,
  },
  {
    acadTermId: "AY202627T1",
    predictionType: "MIN",
    multiplierType: "EMPIRICAL",
    beatsPercentage: 95,
    multiplier: 2,
  },
  {
    acadTermId: "AY202627T1",
    predictionType: "MEDIAN",
    multiplierType: "EMPIRICAL",
    beatsPercentage: 70,
    multiplier: 1,
  },
  // Wrong term / type / multiplier kind — must all be filtered out.
  {
    acadTermId: "AY202526T2",
    predictionType: "MIN",
    multiplierType: "EMPIRICAL",
    beatsPercentage: 70,
    multiplier: 99,
  },
  {
    acadTermId: "AY202627T1",
    predictionType: "MIN",
    multiplierType: "THEORETICAL",
    beatsPercentage: 70,
    multiplier: 99,
  },
];

describe("filterSafetyFactors", () => {
  it("keeps only empirical factors for the given term and prediction type", () => {
    const filtered = filterSafetyFactors(FACTORS, "AY202627T1", "MIN");
    expect(filtered).toHaveLength(2);
    expect(
      filtered.every(
        (sf) =>
          sf.acadTermId === "AY202627T1" &&
          sf.predictionType === "MIN" &&
          sf.multiplierType === "EMPIRICAL",
      ),
    ).toBe(true);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterSafetyFactors(FACTORS, "AY9999T9", "MIN")).toEqual([]);
  });
});

describe("multiplierAt", () => {
  it("returns the multiplier for the exact beats percentage", () => {
    const filtered = filterSafetyFactors(FACTORS, "AY202627T1", "MIN");
    expect(multiplierAt(filtered, 70)).toBe(0.5);
    expect(multiplierAt(filtered, 95)).toBe(2);
  });

  it("falls back to 1 when no factor matches the beats percentage", () => {
    const filtered = filterSafetyFactors(FACTORS, "AY202627T1", "MIN");
    expect(multiplierAt(filtered, 60)).toBe(1);
    expect(multiplierAt([], 70)).toBe(1);
  });
});

describe("recommendedBid", () => {
  it("computes predicted + multiplier × uncertainty", () => {
    expect(recommendedBid(100, 0.5, 40)).toBe(120);
  });

  it("returns the prediction unchanged when the multiplier is 0", () => {
    expect(recommendedBid(100, 0, 40)).toBe(100);
  });
});

describe("computeRecommendedRange", () => {
  const prediction = {
    bidWindow: { acadTermId: "AY202627T1" },
    minPredicted: 100,
    minUncertainty: 40,
    medianPredicted: 200,
    medianUncertainty: 60,
  };

  it("adjusts min and median by their own safety factors", () => {
    // MIN @70 → 100 + 0.5×40 = 120; MEDIAN @70 → 200 + 1×60 = 260
    expect(computeRecommendedRange(prediction, FACTORS, 70)).toEqual({
      min: 120,
      median: 260,
    });
  });

  it("responds to the success-rate slider", () => {
    // MIN @95 → 100 + 2×40 = 180; MEDIAN @95 has no factor → 200 + 1×60 = 260
    expect(computeRecommendedRange(prediction, FACTORS, 95)).toEqual({
      min: 180,
      median: 260,
    });
  });

  it("falls back to multiplier 1 when the term has no factors", () => {
    const noFactors = computeRecommendedRange(prediction, [], 70);
    expect(noFactors).toEqual({ min: 140, median: 260 });
  });
});
