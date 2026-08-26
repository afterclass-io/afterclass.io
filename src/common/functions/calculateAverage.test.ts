import { describe, expect, it } from "vitest";
import { calculateAverage } from "./calculateAverage";

describe("calculateAverage", () => {
  it("averages a list of numbers", () => {
    expect(calculateAverage([2, 4, 6])).toBe(4);
    expect(calculateAverage([5])).toBe(5);
    expect(calculateAverage([1, 2])).toBe(1.5);
  });

  it("handles negatives that cancel out", () => {
    expect(calculateAverage([-2, 2])).toBe(0);
  });

  it("returns NaN for an empty array (0 / 0)", () => {
    expect(calculateAverage([])).toBeNaN();
  });
});
