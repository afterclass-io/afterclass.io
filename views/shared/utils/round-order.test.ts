import { describe, expect, it } from "vitest";
import { compareRounds, ROUND_ORDER } from "./round-order";

describe("ROUND_ORDER", () => {
  it("orders the 7 known BOSS rounds 1 < 1A < 1B < 1C < 1F < 2 < 2A", () => {
    const rounds = ["2A", "2", "1F", "1C", "1B", "1A", "1"];
    expect([...rounds].sort(compareRounds)).toEqual([
      "1",
      "1A",
      "1B",
      "1C",
      "1F",
      "2",
      "2A",
    ]);
  });

  it("sorts unknown rounds alphabetically after all known rounds", () => {
    expect(compareRounds("3", "1")).toBeGreaterThan(0);
    expect(compareRounds("1", "3")).toBeLessThan(0);
    expect(compareRounds("ZZ", "AA")).toBeGreaterThan(0);
    expect(compareRounds("AA", "ZZ")).toBeLessThan(0);
  });

  it("treats equal rounds as equal (known and unknown)", () => {
    expect(compareRounds("1A", "1A")).toBe(0);
    expect(compareRounds("ZZ", "ZZ")).toBe(0);
    expect(Object.keys(ROUND_ORDER)).toHaveLength(7);
  });
});
