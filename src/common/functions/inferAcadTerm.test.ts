import { describe, expect, it } from "vitest";
import { inferAcadTerm } from "./inferAcadTerm";

describe("inferAcadTerm", () => {
  it("splits an 'AY{start}{end}T{term}' id into its parts", () => {
    expect(inferAcadTerm("AY202627T1")).toEqual({
      acadYear: "AY202627",
      term: "1",
      displayYear: "2026-27",
      shortLabel: "26-27 T1",
    });
  });

  it("keeps multi-char term suffixes (special terms / sub-rounds)", () => {
    expect(inferAcadTerm("AY202526T3B")).toMatchObject({
      term: "3B",
      displayYear: "2025-26",
      shortLabel: "25-26 T3B",
    });
  });

  it("derives displayYear and shortLabel from the year-digit slices", () => {
    expect(inferAcadTerm("AY202021T2")).toMatchObject({
      displayYear: "2020-21",
      shortLabel: "20-21 T2",
    });
  });

  it("does not throw on an id with no 'T' separator (degenerate output)", () => {
    const r = inferAcadTerm("AY202627");
    expect(r.acadYear).toBe("AY202627");
    expect(r.term).toBeUndefined();
  });
});
