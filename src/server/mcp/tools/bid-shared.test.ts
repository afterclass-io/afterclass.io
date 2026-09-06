import { describe, expect, it } from "vitest";
import {
  clampBidFloor,
  DEFAULT_BEATS_PERCENTAGE,
  findSafetyFactor,
  MIN_BID,
  rationaleFor,
  stripShareToken,
  suggestBidAmount,
} from "./bid-shared";

describe("clampBidFloor", () => {
  it("floors sub-minimum suggestions at e$10", () => {
    expect(MIN_BID).toBe(10);
    expect(clampBidFloor(4.2)).toBe(10);
    expect(clampBidFloor(10)).toBe(10);
    expect(clampBidFloor(63.5)).toBe(63.5);
  });
});

describe("suggestBidAmount", () => {
  it("returns null for a null median", () => {
    expect(suggestBidAmount(null)).toBeNull();
    expect(suggestBidAmount(null, 1.05)).toBeNull();
  });

  it("defaults the multiplier to 1.0 and applies the e$10 floor", () => {
    expect(suggestBidAmount(25)).toBe(25);
    expect(suggestBidAmount(25, 1.05)).toBe(26.25);
    // 8 x 1.05 = 8.4 -> floored
    expect(suggestBidAmount(8, 1.05)).toBe(10);
    expect(suggestBidAmount(6)).toBe(10);
  });
});

describe("rationaleFor", () => {
  it("builds the multiplier rationale when a factor matched", () => {
    expect(rationaleFor(25, 1.05, 70)).toBe(
      "Predicted median 25 x safety multiplier 1.05 (beats 70% of bids).",
    );
  });

  it("builds the no-factor rationale, with term context when given", () => {
    expect(rationaleFor(25, null, 70)).toBe(
      "No safety factor for beats 70%; suggested = predicted median 25 x 1.0.",
    );
    expect(rationaleFor(25, null, 70, "t1")).toBe(
      "No safety factor for beats 70% in t1; suggested = predicted median 25 x 1.0.",
    );
  });

  it("defaults beats to 70", () => {
    expect(DEFAULT_BEATS_PERCENTAGE).toBe(70);
    expect(rationaleFor(25, 1.05)).toContain("beats 70%");
  });
});

describe("findSafetyFactor", () => {
  const factors = [
    {
      acadTermId: "t1",
      predictionType: "MEDIAN",
      beatsPercentage: 70,
      multiplier: 1.05,
    },
    {
      acadTermId: "t1",
      predictionType: "MIN",
      beatsPercentage: 70,
      multiplier: 9.9,
    },
    {
      acadTermId: "t2",
      predictionType: "MEDIAN",
      beatsPercentage: 70,
      multiplier: 1.1,
    },
  ];

  it("finds the MEDIAN row for the term at 70% by default", () => {
    expect(findSafetyFactor(factors, "t1")?.multiplier).toBe(1.05);
  });

  it("returns undefined when nothing matches", () => {
    expect(findSafetyFactor(factors, "t9")).toBeUndefined();
    expect(findSafetyFactor([], "t1")).toBeUndefined();
  });
});

describe("stripShareToken", () => {
  it("drops shareToken and icalToken keys, keeps the rest", () => {
    const out = stripShareToken({
      id: "x",
      name: "A",
      shareToken: "s",
      icalToken: "i",
    });
    expect(out).toEqual({ id: "x", name: "A" });
    expect("shareToken" in out).toBe(false);
    expect("icalToken" in out).toBe(false);
  });
});
