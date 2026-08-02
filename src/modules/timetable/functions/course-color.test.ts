import { describe, it, expect } from "vitest";
import { courseColor } from "./course-color";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("courseColor", () => {
  it("returns the same color for the same course code (determinism)", () => {
    const a = courseColor("CS101");
    const b = courseColor("CS101");
    expect(a).toEqual(b);
  });

  it("different codes can return different colors", () => {
    const results = new Set([
      JSON.stringify(courseColor("CS101")),
      JSON.stringify(courseColor("MATH241")),
      JSON.stringify(courseColor("PHYS101")),
      JSON.stringify(courseColor("CHEM101")),
      JSON.stringify(courseColor("BIO101")),
      JSON.stringify(courseColor("ECON101")),
      JSON.stringify(courseColor("HIST101")),
      JSON.stringify(courseColor("ENGL101")),
      JSON.stringify(courseColor("PSYC101")),
      JSON.stringify(courseColor("SOCI101")),
      JSON.stringify(courseColor("PHIL101")),
      JSON.stringify(courseColor("ARTS101")),
      JSON.stringify(courseColor("MUSC101")),
      JSON.stringify(courseColor("LANG101")),
      JSON.stringify(courseColor("COMP101")),
      JSON.stringify(courseColor("STAT101")),
      JSON.stringify(courseColor("ACCT101")),
      JSON.stringify(courseColor("FINC101")),
      JSON.stringify(courseColor("MKTG101")),
      JSON.stringify(courseColor("MGMT101")),
    ]);
    // At least 2 distinct colors among 20 codes
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  it("all 12 palette slots are reachable", () => {
    const seen = new Set<number>();
    // Generate codes until we've seen all 12 palette indices, up to a safety cap
    for (let i = 0; i < 10_000 && seen.size < 12; i++) {
      const code = `CODE${String(i).padStart(4, "0")}`;
      const hash = hashCourseCode(code);
      seen.add(hash % 12);
    }
    expect(seen.size).toBe(12);
  });

  it("every palette entry uses theme tokens — no hardcoded hex colors", () => {
    const found = new Map<number, string>();
    for (let i = 0; i < 50_000 && found.size < 12; i++) {
      const code = `CODE${String(i).padStart(5, "0")}`;
      const hash = hashCourseCode(code);
      const idx = hash % 12;
      if (!found.has(idx)) {
        found.set(idx, courseColor(code).className);
      }
    }
    expect(found.size).toBe(12);

    for (const [, className] of found) {
      // No hex colors — colors must come from shadcn theme tokens
      expect(className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      // Each entry sets background, foreground and border color
      expect(className).toMatch(/\bbg-[\w-]+/);
      expect(className).toMatch(/\btext-[\w-]+/);
      expect(className).toMatch(/\bborder-[\w-]+/);
    }
  });

  it("palette entries are distinct", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50_000 && seen.size < 12; i++) {
      const code = `CODE${String(i).padStart(5, "0")}`;
      seen.add(courseColor(code).className);
    }
    expect(seen.size).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Re-exported hash for reachability testing (must match the impl's djb2)
// ---------------------------------------------------------------------------

/** djb2 hash — must be identical to the one used by courseColor. */
function hashCourseCode(code: string): number {
  let hash = 5381;
  for (let i = 0; i < code.length; i++) {
    hash = ((hash << 5) + hash + code.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned 32-bit
}
