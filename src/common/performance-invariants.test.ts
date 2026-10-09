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

  describe("fonts and favicon (#506)", () => {
    const listSourceFiles = (dir: string): string[] =>
      fs
        .readdirSync(path.join(repoRoot, dir), { withFileTypes: true })
        .flatMap((entry) => {
          const relative = `${dir}/${entry.name}`;
          return entry.isDirectory() ? listSourceFiles(relative) : [relative];
        });
    const sourceFiles = [
      ...listSourceFiles("src"),
      ...listSourceFiles("views"),
    ].filter((file) => !file.startsWith("src/generated/"));

    it("downloads a webfont only when a stylesheet binds its variable", () => {
      const styles = sourceFiles
        .filter((file) => file.endsWith(".css"))
        .map(read)
        .join("\n");
      const declarations = sourceFiles
        .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."))
        .filter((file) => read(file).includes("next/font/"))
        .flatMap((file) =>
          [...read(file).matchAll(/variable:\s*"(--[\w-]+)"/g)].map(
            (match) => ({ file, variable: match[1] }),
          ),
        );
      const unbound = declarations.filter(
        ({ variable }) => !styles.includes(`var(${variable}`),
      );
      expect(unbound).toEqual([]);
    });

    it("injects no font class into the root element or the error boundary", () => {
      expect(read("src/app/layout.tsx")).not.toContain(".variable");
      expect(read("src/app/global-error.tsx")).not.toContain(".variable");
    });

    it("keeps the favicon under 10 KB", () => {
      const bytes = fs.statSync(
        path.join(repoRoot, "src/app/favicon.ico"),
      ).size;
      expect(bytes).toBeLessThan(10 * 1024);
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
