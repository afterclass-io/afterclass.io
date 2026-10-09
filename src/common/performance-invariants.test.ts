import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Performance decisions with no runtime seam are pinned here by reading the
// source from disk, as `tools/trpc/react.test.ts` does for the fetch policy.
// Each performance ticket under #502 appends its own describe block.

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf-8");

describe("performance invariants", () => {
  describe("build config (#514)", () => {
    // next.config.js is read as text: importing it runs env validation and
    // the Sentry and MCP wrappers.
    const config = read("next.config.js");

    it("serves AVIF and WebP", () => {
      expect(config).toContain('formats: ["image/avif", "image/webp"]');
    });

    it("allows the avatar hosts for next/image", () => {
      expect(config).toContain('hostname: "lh3.googleusercontent.com"');
      expect(config).toContain(
        'hostname: "afterclass-user-profile-pics.s3.amazonaws.com"',
      );
    });

    it("removes console output in production but keeps errors and warnings", () => {
      expect(config).toMatch(
        /removeConsole:\s*\{\s*exclude:\s*\[[^\]]*"error"/,
      );
      expect(config).toMatch(/removeConsole:\s*\{\s*exclude:\s*\[[^\]]*"warn"/);
    });

    it("optimises the large barrel packages that Next.js does not cover", () => {
      expect(config).toContain("optimizePackageImports");
      expect(config).toContain('"@xyflow/react"');
      expect(config).toContain('"@dnd-kit/core"');
      expect(config).toContain('"@dnd-kit/sortable"');
    });
  });

  describe("field vitals (#504)", () => {
    it("mounts the web vitals reporter in the root layout", () => {
      const layout = read("src/app/layout.tsx");
      expect(layout).toContain("<WebVitalsReporter />");
    });

    it("reports through the Next.js hook, with no extra vitals dependency", () => {
      const reporter = read(
        "src/modules/home/components/WebVitalsReporter/WebVitalsReporter.tsx",
      );
      expect(reporter).toContain("useReportWebVitals");
      const manifest = JSON.parse(read("package.json")) as {
        dependencies: Record<string, string>;
      };
      expect(manifest.dependencies).not.toHaveProperty("web-vitals");
      expect(manifest.dependencies).not.toHaveProperty(
        "@vercel/speed-insights",
      );
    });
  });
});
