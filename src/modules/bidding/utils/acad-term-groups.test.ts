import { describe, it, expect } from "vitest";
import {
  computeAcadTermGroups,
  buildGroupIndexMap,
} from "./acad-term-groups";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal data point with just a bidWindow string */
function pt(bidWindow: string) {
  return { bidWindow };
}

// ---------------------------------------------------------------------------
// computeAcadTermGroups
// ---------------------------------------------------------------------------

describe("computeAcadTermGroups", () => {
  it("returns empty array for empty input", () => {
    expect(computeAcadTermGroups([])).toEqual([]);
  });

  it("returns one group for a single data point", () => {
    const data = [pt("AY202526T1/1/1")];
    const groups = computeAcadTermGroups(data);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.acadTermId).toBe("AY202526T1");
    expect(groups[0]!.firstBidWindow).toBe("AY202526T1/1/1");
    expect(groups[0]!.lastBidWindow).toBe("AY202526T1/1/1");
  });

  it("returns one group for multiple points in the same acadTermId", () => {
    const data = [
      pt("AY202526T1/1/1"),
      pt("AY202526T1/1A/1"),
      pt("AY202526T1/2/1"),
    ];
    const groups = computeAcadTermGroups(data);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.acadTermId).toBe("AY202526T1");
    expect(groups[0]!.firstBidWindow).toBe("AY202526T1/1/1");
    expect(groups[0]!.lastBidWindow).toBe("AY202526T1/2/1");
  });

  it("splits into multiple groups when acadTermId changes", () => {
    const data = [
      pt("AY202425T1/1/1"),
      pt("AY202425T1/2/1"),
      pt("AY202526T1/1/1"),
      pt("AY202526T1/1A/1"),
      pt("AY202627T1/1/1"),
    ];
    const groups = computeAcadTermGroups(data);
    expect(groups).toHaveLength(3);
    expect(groups[0]!.acadTermId).toBe("AY202425T1");
    expect(groups[0]!.firstBidWindow).toBe("AY202425T1/1/1");
    expect(groups[0]!.lastBidWindow).toBe("AY202425T1/2/1");
    expect(groups[1]!.acadTermId).toBe("AY202526T1");
    expect(groups[1]!.firstBidWindow).toBe("AY202526T1/1/1");
    expect(groups[1]!.lastBidWindow).toBe("AY202526T1/1A/1");
    expect(groups[2]!.acadTermId).toBe("AY202627T1");
    expect(groups[2]!.firstBidWindow).toBe("AY202627T1/1/1");
    expect(groups[2]!.lastBidWindow).toBe("AY202627T1/1/1");
  });

  it("handles non-contiguous same acadTermId as separate groups", () => {
    // Same acadTermId appears, then a different one, then back again
    const data = [
      pt("AY202425T1/1/1"),
      pt("AY202526T1/1/1"),
      pt("AY202425T1/2/1"),
    ];
    const groups = computeAcadTermGroups(data);
    expect(groups).toHaveLength(3);
    expect(groups[0]!.acadTermId).toBe("AY202425T1");
    expect(groups[1]!.acadTermId).toBe("AY202526T1");
    expect(groups[2]!.acadTermId).toBe("AY202425T1");
  });

  it("treats items with no slash as their own acadTermId group", () => {
    const data = [
      pt("AY202425T1/1/1"),
      { bidWindow: "malformed" }, // treated as a standalone group
      pt("AY202526T1/1/1"),
    ];
    const groups = computeAcadTermGroups(data);
    // Each gets its own group since all acadTermIds differ
    expect(groups).toHaveLength(3);
    expect(groups[0]!.acadTermId).toBe("AY202425T1");
    expect(groups[1]!.acadTermId).toBe("malformed");
    expect(groups[2]!.acadTermId).toBe("AY202526T1");
  });

  it("produces a shortLabel for each group", () => {
    const data = [pt("AY202526T1/1/1")];
    const groups = computeAcadTermGroups(data);
    expect(groups[0]!.shortLabel).toBeTruthy();
    expect(typeof groups[0]!.shortLabel).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// buildGroupIndexMap
// ---------------------------------------------------------------------------

describe("buildGroupIndexMap", () => {
  it("returns empty map for empty input", () => {
    const map = buildGroupIndexMap([], []);
    expect(map.size).toBe(0);
  });

  it("assigns every data point to the correct group", () => {
    const data = [
      pt("AY202425T1/1/1"),
      pt("AY202425T1/2/1"),
      pt("AY202526T1/1/1"),
      pt("AY202526T1/1A/1"),
    ];
    const groups = computeAcadTermGroups(data);

    const map = buildGroupIndexMap(data, groups);
    expect(map.get("AY202425T1/1/1")).toBe(0);
    expect(map.get("AY202425T1/2/1")).toBe(0);
    expect(map.get("AY202526T1/1/1")).toBe(1);
    expect(map.get("AY202526T1/1A/1")).toBe(1);
  });

  it("handles three groups correctly", () => {
    const data = [
      pt("AY202425T1/1/1"),
      pt("AY202526T1/1/1"),
      pt("AY202627T1/1/1"),
    ];
    const groups = computeAcadTermGroups(data);

    const map = buildGroupIndexMap(data, groups);
    expect(map.get("AY202425T1/1/1")).toBe(0);
    expect(map.get("AY202526T1/1/1")).toBe(1);
    expect(map.get("AY202627T1/1/1")).toBe(2);
  });

  it("produces a map that covers all data points", () => {
    const data = [
      pt("AY202425T1/1/1"),
      pt("AY202425T1/1A/1"),
      pt("AY202425T1/2/1"),
      pt("AY202526T1/1/1"),
    ];
    const groups = computeAcadTermGroups(data);
    const map = buildGroupIndexMap(data, groups);
    expect(map.size).toBe(data.length);
  });
});
