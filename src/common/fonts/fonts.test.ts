import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("fonts configuration and invariants", () => {
  const rootDir = path.resolve(import.meta.dirname, "../../..");
  const fontsDir = path.resolve(import.meta.dirname);

  it("inter.ts configures display: 'swap' and --font-inter variable", () => {
    const interSrc = fs.readFileSync(path.join(fontsDir, "inter.ts"), "utf-8");
    expect(interSrc).toContain('display: "swap"');
    expect(interSrc).toContain('variable: "--font-inter"');
  });

  it("poppins font has been completely removed", () => {
    expect(fs.existsSync(path.join(fontsDir, "poppins.ts"))).toBe(false);

    const indexSrc = fs.readFileSync(path.join(fontsDir, "index.ts"), "utf-8");
    expect(indexSrc).not.toContain("poppins");

    const layoutSrc = fs.readFileSync(
      path.join(rootDir, "src/app/layout.tsx"),
      "utf-8",
    );
    expect(layoutSrc).not.toContain("poppins");

    const globalErrorSrc = fs.readFileSync(
      path.join(rootDir, "src/app/global-error.tsx"),
      "utf-8",
    );
    expect(globalErrorSrc).not.toContain("poppins");
  });

  it("every declared font variable is bound in stylesheets", () => {
    const shadcnCss = fs.readFileSync(
      path.join(rootDir, "src/common/styles/shadcn.css"),
      "utf-8",
    );
    // --font-inter must be mapped to font-sans in @theme inline
    expect(shadcnCss).toMatch(/--font-sans:\s*var\(--font-inter\)/);
  });
});
