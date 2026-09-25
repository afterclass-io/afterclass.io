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
});
