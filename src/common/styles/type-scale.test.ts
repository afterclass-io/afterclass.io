import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cssContent = fs.readFileSync(
  path.resolve(import.meta.dirname, "shadcn.css"),
  "utf-8",
);
const themeInline = /@theme\s+inline\s*\{([^}]+)\}/.exec(cssContent)?.[1] ?? "";

describe("type scale tokens", () => {
  it("declares text-2xs as 11px in @theme inline", () => {
    expect(themeInline).toMatch(/--text-2xs\s*:\s*0\.6875rem\s*;/);
  });

  it("gives text-2xs a 14px line height", () => {
    expect(themeInline).toMatch(/--text-2xs--line-height\s*:\s*0\.875rem\s*;/);
  });
});
