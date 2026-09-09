import { describe, expect, it } from "vitest";
import { shortTermLabel } from "./term-label";

describe("shortTermLabel", () => {
  it("shortens slashed term ids", () => {
    expect(shortTermLabel("AY2025/26-T1")).toBe("25/26-T1");
    expect(shortTermLabel("AY2024/25-T3A")).toBe("24/25-T3A");
  });

  it("shortens compact DB forms like inferAcadTerm's shortLabel", () => {
    expect(shortTermLabel("AY202627T1")).toBe("26-27 T1");
    expect(shortTermLabel("AY202425T3A")).toBe("24-25 T3A");
  });

  it("passes unknown shapes through unchanged", () => {
    expect(shortTermLabel("T1")).toBe("T1");
    expect(shortTermLabel("")).toBe("");
  });
});
