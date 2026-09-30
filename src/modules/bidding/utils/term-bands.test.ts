import { describe, expect, it } from "vitest";
import { computeAcadTermGroups } from "./acad-term-groups";
import {
  computeTermBandBounds,
  computeTermBoundaries,
  shouldShowNowMarker,
  withPlotIndex,
} from "./term-bands";

const pts = [{ bidWindow: "AY202526T1/1C/1" }, { bidWindow: "AY202627T1/2/1" }];

describe("term-bands", () => {
  it("extends each band half a step beyond its extreme ticks", () => {
    const indexed = withPlotIndex(pts);
    const groups = computeAcadTermGroups(indexed);
    expect(computeTermBandBounds(indexed, groups)).toEqual([
      { acadTermId: "AY202526T1", x1: -0.5, x2: 0.5 },
      { acadTermId: "AY202627T1", x1: 0.5, x2: 1.5 },
    ]);
  });

  it("places one boundary halfway between terms", () => {
    expect(computeTermBoundaries(withPlotIndex(pts))).toEqual([0.5]);
  });

  it("gates now on the visible current term", () => {
    const indexed = withPlotIndex(pts);
    expect(shouldShowNowMarker(indexed, "AY202627T1")).toBe(true);
    expect(shouldShowNowMarker(indexed, "AY202425T1")).toBe(false);
  });
});
