import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Reads source files from disk to pin decisions that have no runtime seam.
// Follows the pattern in ./trpc/react.test.ts.
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(import.meta.dirname, relativePath), "utf-8");

describe("performance invariants", () => {
  it("keeps error-triggered replay at full rate", () => {
    expect(readSource("../../../instrumentation-client.ts")).toContain(
      "replaysOnErrorSampleRate: 1.0",
    );
  });

  it("masks replay text and blocks media", () => {
    const src = readSource("../../../instrumentation-client.ts");
    expect(src).toContain("maskAllText: true");
    expect(src).toContain("blockAllMedia: true");
  });

  it("removes continuous browser profiling and its document policy", () => {
    const src = readSource("../../../instrumentation-client.ts");
    expect(src).not.toContain("browserProfilingIntegration");
    expect(src).not.toContain("profilesSampleRate");

    const config = readSource("../../../next.config.js");
    expect(config).not.toContain("Document-Policy");
    expect(config).not.toContain("js-profiling");
  });

  it("gates trace sampling to production on client and edge", () => {
    const gate = 'process.env.NODE_ENV === "production" ? 0.1 : 1';
    expect(readSource("../../../instrumentation-client.ts")).toContain(gate);
    expect(readSource("../../../sentry.edge.config.ts")).toContain(gate);
  });

  it("drops the unused Poppins and Inter webfonts", () => {
    const root = path.resolve(import.meta.dirname, "../../..");
    expect(fs.existsSync(path.join(root, "src/common/fonts/poppins.ts"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(root, "src/common/fonts/inter.ts"))).toBe(
      false,
    );

    for (const file of ["src/app/layout.tsx", "src/app/global-error.tsx"]) {
      const src = readSource(`../../../${file}`);
      expect(src).not.toContain("common/fonts");
      expect(src).not.toContain("--font-inter");
      expect(src).not.toContain("--font-poppins");
      expect(src).not.toContain("inter.variable");
      expect(src).not.toContain("poppins.variable");
    }
  });

  it("binds every declared font variable to a stylesheet token", () => {
    const root = path.resolve(import.meta.dirname, "../../..");
    const fontsDir = path.join(root, "src/common/fonts");
    if (!fs.existsSync(fontsDir)) return;

    const declared = fs
      .readdirSync(fontsDir)
      .filter((file) => file.endsWith(".ts"))
      .flatMap((file) => {
        const src = fs.readFileSync(path.join(fontsDir, file), "utf-8");
        return [...src.matchAll(/variable:\s*"(--font-[^"]+)"/g)].map(
          (match) => match[1],
        );
      });

    const stylesDir = path.join(root, "src/common/styles");
    const css = fs
      .readdirSync(stylesDir)
      .map((file) => fs.readFileSync(path.join(stylesDir, file), "utf-8"))
      .join("\n");

    for (const variable of declared) {
      expect(css, variable).toContain(variable);
    }
  });

  it("keeps every app icon under 10 KB", () => {
    const root = path.resolve(import.meta.dirname, "../../../src/app");
    const icons: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/^(favicon\.ico|icon\..+)$/.test(entry.name)) icons.push(full);
      }
    };
    walk(root);

    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(fs.statSync(icon).size, icon).toBeLessThanOrEqual(10_000);
    }
  });

  it("caches the edge config read behind the invalidation tag", () => {
    const src = readSource("../providers/EdgeConfig/EdgeConfigProvider.tsx");
    expect(src).toContain("unstable_cache");
    expect(src).toContain('"edge-config"');
  });

  it("invalidates the edge-config tag on demand", () => {
    const src = readSource(
      "../../app/api/cron/revalidate-edge-config/route.ts",
    );
    expect(src).toContain('revalidateTag("edge-config"');
  });

  it("gives the streaming data-heavy routes a loading boundary", () => {
    const root = path.resolve(import.meta.dirname, "../../..");
    // /roadmaps is deliberately excluded: that segment contains only the
    // searchParams/auth gates (redirects and notFound), and a boundary above
    // them would stream a 200 over the 307/404.
    for (const route of [
      "src/app/(school)/bidding",
      "src/app/(school)/bidding/analytics",
      "src/app/(school)/search",
      "src/app/(school)/submit",
    ]) {
      expect(fs.existsSync(path.join(root, route, "loading.tsx")), route).toBe(
        true,
      );
    }
  });
});
