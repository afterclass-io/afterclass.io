import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sidebarSkeletonWidth } from "./sidebar";

describe("sidebar responsive shell", () => {
  it("drives the desktop/mobile switch from CSS, not from the mobile hook", () => {
    const src = fs.readFileSync(
      path.resolve(import.meta.dirname, "./sidebar.tsx"),
      "utf-8",
    );
    // The desktop shell's visibility is gated by the 1250px breakpoint in CSS,
    // so the server emits markup that already matches the final layout.
    expect(src).toContain("laptop:block");
    expect(src).toContain("laptop:flex");
    // The structural branch on the JS boolean is gone; the hook is reserved for
    // genuine JS-boolean needs (toggle direction, tooltip placement).
    expect(src).not.toMatch(/if\s*\(\s*isMobile\s*\)/);
  });
});

describe("sidebarSkeletonWidth", () => {
  it("is deterministic: the same index yields the same width across calls", () => {
    const first = sidebarSkeletonWidth(3);
    for (let i = 0; i < 10; i++) {
      expect(sidebarSkeletonWidth(3)).toBe(first);
    }
  });

  it("varies by index so consecutive items do not all look identical", () => {
    const widths = new Set([0, 1, 2, 3, 4, 5, 6, 7].map(sidebarSkeletonWidth));
    expect(widths.size).toBeGreaterThan(1);
  });

  it("stays within the previous 50-89% random range", () => {
    for (let i = 0; i < 24; i++) {
      const width = sidebarSkeletonWidth(i);
      expect(width).toMatch(/^\d{2}%$/);
      const value = parseInt(width, 10);
      expect(value).toBeGreaterThanOrEqual(50);
      expect(value).toBeLessThanOrEqual(89);
    }
  });
});
