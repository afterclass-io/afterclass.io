import { describe, it, expect } from "vitest";
import cases from "./term-mapping.cases.json";
import {
  mapRoadmapTermToAcadCode,
  extractAcadTermCode,
  findAcadTermForRoadmapTerm,
} from "./term-mapping";

// ---------------------------------------------------------------------------
// mapRoadmapTermToAcadCode
// ---------------------------------------------------------------------------

describe("mapRoadmapTermToAcadCode", () => {
  it("maps T3A and T3B onto T3", () => {
    expect(mapRoadmapTermToAcadCode("T3A")).toBe("T3");
    expect(mapRoadmapTermToAcadCode("T3B")).toBe("T3");
  });

  it("passes T1 and T2 through unchanged", () => {
    expect(mapRoadmapTermToAcadCode("T1")).toBe("T1");
    expect(mapRoadmapTermToAcadCode("T2")).toBe("T2");
  });
});

// ---------------------------------------------------------------------------
// extractAcadTermCode
// ---------------------------------------------------------------------------

describe("extractAcadTermCode", () => {
  it("extracts the full term code from an acad term label", () => {
    expect(extractAcadTermCode("AY2024/25 T1")).toBe("T1");
    expect(extractAcadTermCode("AY2025/26 T2")).toBe("T2");
    expect(extractAcadTermCode("AY2024/25 T3")).toBe("T3");
  });

  it("returns null when the label has no term suffix", () => {
    expect(extractAcadTermCode("AY2024/25")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findAcadTermForRoadmapTerm
// ---------------------------------------------------------------------------

describe("findAcadTermForRoadmapTerm", () => {
  it("returns the matching row for T1 and T2", () => {
    expect(findAcadTermForRoadmapTerm("T1", cases)).toEqual(cases[0]);
    expect(findAcadTermForRoadmapTerm("T2", cases)).toEqual(cases[1]);
  });

  it("returns the T3 row for T3A, T3B, and T3", () => {
    expect(findAcadTermForRoadmapTerm("T3A", cases)).toEqual(cases[2]);
    expect(findAcadTermForRoadmapTerm("T3B", cases)).toEqual(cases[2]);
    expect(findAcadTermForRoadmapTerm("T3", cases)).toEqual(cases[2]);
  });

  it("returns undefined for empty list or when term is not present", () => {
    expect(findAcadTermForRoadmapTerm("T1", [])).toBeUndefined();
    expect(findAcadTermForRoadmapTerm("T3A", [cases[0]!])).toBeUndefined();
  });
});
