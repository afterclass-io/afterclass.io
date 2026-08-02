import { describe, it, expect } from "vitest";
import { mapRoadmapTermToAcadCode, extractAcadTermCode } from "./term-mapping";

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
