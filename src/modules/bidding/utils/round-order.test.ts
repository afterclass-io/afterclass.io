import { describe, expect, it } from "vitest";
import { compareRounds } from "./round-order";

describe("compareRounds", () => {
  it("orders the seven known BOSS rounds canonically regardless of input order", () => {
    const shuffled = ["2A", "1", "1C", "1A", "2", "1B", "1F"];
    expect(shuffled.toSorted(compareRounds)).toEqual([
      "1",
      "1A",
      "1B",
      "1C",
      "1F",
      "2",
      "2A",
    ]);
  });

  it("sorts unknown rounds after every known round", () => {
    expect(compareRounds("1", "9X")).toBeLessThan(0);
    expect(["9X", "1A"].toSorted(compareRounds)).toEqual(["1A", "9X"]);
  });

  it("breaks ties between two unknown rounds alphabetically", () => {
    expect(compareRounds("ZB", "ZA")).toBeGreaterThan(0);
    expect(["ZB", "ZA"].toSorted(compareRounds)).toEqual(["ZA", "ZB"]);
  });

  it("treats two equal known rounds as equivalent", () => {
    expect(compareRounds("1A", "1A")).toBe(0);
  });
});
