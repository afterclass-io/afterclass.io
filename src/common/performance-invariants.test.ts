import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Performance decisions with no runtime seam are pinned here by reading the
// source from disk, as `tools/trpc/react.test.ts` does for the fetch policy.
// Each performance ticket under #502 appends its own describe block.

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf-8");

const listFiles = (dir: string): string[] =>
  fs
    .readdirSync(path.join(repoRoot, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = `${dir}/${entry.name}`;
      return entry.isDirectory() ? listFiles(relative) : [relative];
    });

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
    const sourceFiles = [...listFiles("src"), ...listFiles("views")].filter(
      (file) => !file.startsWith("src/generated/"),
    );

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

  describe("sidebar first paint (#517)", () => {
    it("keeps the CSS breakpoint equal to the hook breakpoint", () => {
      const css = read("src/common/styles/globals.css");
      const hook = read("src/common/hooks/use-mobile.ts");
      const cssWidth = /--breakpoint-sidebar:\s*(\d+)px/.exec(css)?.[1];
      const hookWidth = /MOBILE_BREAKPOINT\s*=\s*(\d+)/.exec(hook)?.[1];
      expect(cssWidth).toBeDefined();
      expect(cssWidth).toBe(hookWidth);
    });

    it("shows the desktop shell with CSS, not with the isMobile hook", () => {
      const sidebar = read("src/common/components/sidebar.tsx");
      expect(sidebar).toContain("sidebar:block");
      expect(sidebar).toContain("sidebar:flex");
      // `md` is 768 px: using it left a desktop shell on the server render
      // for 768 to 1249 px, which flipped to the sheet after hydration.
      expect(sidebar).not.toMatch(/md:(block|flex|hidden)/);
    });

    it("uses no random number in the sidebar or any skeleton", () => {
      const files = [
        "src/common/components/sidebar.tsx",
        ...listFiles("src").filter((file) => /Skeleton.*\.tsx$/.test(file)),
      ];
      const offenders = files.filter((file) =>
        read(file).includes("Math.random"),
      );
      expect(offenders).toEqual([]);
    });
  });

  describe("edge config read (#518)", () => {
    it("caches only the raw store read, under a tag, with a window", () => {
      const source = read("src/server/ecfg/edge-config.ts");
      expect(source).toContain("unstable_cache(");
      expect(source).toContain("EDGE_CONFIG_CACHE_TAG");
      expect(source).toMatch(/revalidate:\s*EDGE_CONFIG_REVALIDATE_SECONDS/);
      // The per-key fallback must run after the cached read, never inside it.
      expect(
        source.indexOf("mergeStoreWithFallback(rawConfig"),
      ).toBeGreaterThan(source.indexOf("readCachedStore = unstable_cache"));
    });
  });

  describe("avatars (#522)", () => {
    it("serves avatars through next/image with explicit dimensions", () => {
      const avatar = read("src/common/components/avatar.tsx");
      expect(avatar).toContain('from "next/image"');
      expect(avatar).toContain("width={size}");
      expect(avatar).toContain("height={size}");
      expect(avatar).not.toMatch(/<img/);
    });

    it("keeps no avatar dependency that loads the original image", () => {
      const manifest = JSON.parse(read("package.json")) as {
        dependencies: Record<string, string>;
      };
      expect(manifest.dependencies).not.toHaveProperty(
        "@radix-ui/react-avatar",
      );
    });

    it("gives every avatar image a size", () => {
      const tsx = listFiles("src").filter(
        (file) => file.endsWith(".tsx") && !file.includes(".test."),
      );
      const callers = tsx.filter(
        (file) =>
          file !== "src/common/components/avatar.tsx" &&
          read(file).includes("<AvatarImage"),
      );
      expect(callers.length, `${tsx.length} files`).toBeGreaterThan(0);
      for (const file of callers) {
        expect(read(file), file).toMatch(/<AvatarImage[^>]*size=\{\d+\}/);
      }
    });
  });

  describe("parallel route lookups (#521)", () => {
    // The `@header`, `@information` and `@reviews` segments render in
    // parallel. A direct tRPC call in each would run the same lookup again.
    const reviewRoute = listFiles("src/app/(school)/(reviews)").filter(
      (file) => file.endsWith(".tsx") && !file.includes(".test."),
    );
    const reviewHelpers = listFiles("src/modules/reviews/functions").filter(
      (file) => file.endsWith(".ts") && !file.includes(".test."),
    );

    it("looks the course up through the request-cached helper", () => {
      const direct = [...reviewRoute, ...reviewHelpers].filter(
        (file) =>
          !file.endsWith("/getCourseByCode.ts") &&
          read(file).includes("api.courses.getByCourseCode"),
      );
      expect(direct).toEqual([]);
      expect(read("src/modules/reviews/functions/getCourseByCode.ts")).toMatch(
        /cache\(/,
      );
    });

    it("looks the professor up through the request-cached helper", () => {
      const direct = [...reviewRoute, ...reviewHelpers].filter(
        (file) =>
          !file.endsWith("/getProfessorBySlug.ts") &&
          read(file).includes("api.professors.getBySlug"),
      );
      expect(direct).toEqual([]);
      expect(
        read("src/modules/reviews/functions/getProfessorBySlug.ts"),
      ).toMatch(/cache\(/);
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
