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
});
