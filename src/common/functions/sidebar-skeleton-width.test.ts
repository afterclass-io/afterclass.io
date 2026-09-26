import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sidebarMenuSkeletonWidth } from "./sidebar-skeleton-width";

describe("sidebarMenuSkeletonWidth", () => {
  it("is deterministic for a given index", () => {
    expect(sidebarMenuSkeletonWidth(2)).toBe(sidebarMenuSkeletonWidth(2));
    expect(sidebarMenuSkeletonWidth(0)).toBe(sidebarMenuSkeletonWidth(0));
  });

  it("produces more than one distinct value across indices", () => {
    const values = new Set([0, 1, 2, 3].map(sidebarMenuSkeletonWidth));
    expect(values.size).toBeGreaterThan(1);
  });

  it("cycles after the table length", () => {
    expect(sidebarMenuSkeletonWidth(5)).toBe(sidebarMenuSkeletonWidth(0));
    expect(sidebarMenuSkeletonWidth(7)).toBe(sidebarMenuSkeletonWidth(2));
  });
});

describe("sidebar breakpoint drift guard", () => {
  const here = import.meta.dirname;

  it("keeps the CSS variant in sync with MOBILE_BREAKPOINT", () => {
    const hookSrc = fs.readFileSync(
      path.resolve(here, "../hooks/use-mobile.ts"),
      "utf-8",
    );
    const match = /MOBILE_BREAKPOINT\s*=\s*(\d+)/.exec(hookSrc);
    expect(match).not.toBeNull();
    const breakpoint = match![1];

    const sidebarSrc = fs.readFileSync(
      path.resolve(here, "../components/sidebar.tsx"),
      "utf-8",
    );
    expect(sidebarSrc).toContain(`min-[${breakpoint}px]:block`);
    expect(sidebarSrc).toContain(`min-[${breakpoint}px]:flex`);
  });
});
