import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("viewport pinch-zoom invariant (#507)", () => {
  const layoutSrc = fs.readFileSync(
    path.resolve(import.meta.dirname, "./layout.tsx"),
    "utf-8",
  );

  it("viewport declaration does not cap maximum-scale (WCAG 1.4.4)", () => {
    expect(layoutSrc).not.toMatch(/maximum-scale/i);
    expect(layoutSrc).not.toMatch(/maximumScale/);
  });

  it("viewport keeps device-width width and initial-scale 1", () => {
    expect(layoutSrc).toContain('width: "device-width"');
    expect(layoutSrc).toContain("initialScale: 1.0");
  });
});
