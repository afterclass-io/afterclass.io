import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Source-reading invariants for the build-config performance settings (#514).
// Reads next.config.js from disk to avoid executing its jiti/env + Sentry
// side-effects in vitest (same approach as src/common/tools/trpc/react.test.ts).

const configSrc = fs.readFileSync(
  path.resolve(import.meta.dirname, "../next.config.js"),
  "utf-8",
);

describe("next.config.js performance settings (#514)", () => {
  it("serves modern image formats (avif, webp)", () => {
    expect(configSrc).toMatch(
      /formats:\s*\[\s*"image\/avif",\s*"image\/webp"\s*\]/,
    );
  });

  it("lists the Google avatar host in remotePatterns", () => {
    expect(configSrc).toMatch(/remotePatterns:/);
    expect(configSrc).toMatch(/hostname:\s*"lh3\.googleusercontent\.com"/);
  });

  it("optimises package imports for the large packages", () => {
    expect(configSrc).toMatch(/optimizePackageImports:\s*\[/);
    for (const pkg of [
      "lucide-react",
      "date-fns",
      "recharts",
      "@xyflow/react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@radix-ui/react-dialog",
      "rc-slider",
      "driver.js",
      "cmdk",
      "@number-flow/react",
    ]) {
      expect(configSrc).toContain(`"${pkg}"`);
    }
  });

  it("removes console statements in production but keeps error and warn", () => {
    expect(configSrc).toMatch(
      /removeConsole:\s*\{\s*exclude:\s*\[\s*"error",\s*"warn"\s*\],?\s*\}/,
    );
  });
});
