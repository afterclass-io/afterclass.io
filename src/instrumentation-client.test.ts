import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Source-reading invariants for the client-side Sentry config (#505).
// Reads the files from disk to avoid executing Sentry.init / next.config
// side-effects in vitest (same approach as src/common/tools/trpc/react.test.ts).

const clientSrc = fs.readFileSync(
  path.resolve(import.meta.dirname, "../instrumentation-client.ts"),
  "utf-8",
);
const configSrc = fs.readFileSync(
  path.resolve(import.meta.dirname, "../next.config.js"),
  "utf-8",
);

describe("sentry client monitoring config (#505)", () => {
  it("masks all text and blocks all media in session replay", () => {
    expect(clientSrc).toMatch(/maskAllText:\s*true/);
    expect(clientSrc).toMatch(/blockAllMedia:\s*true/);
  });

  it("reduces trace sample rate in production only; development unchanged", () => {
    expect(clientSrc).toMatch(
      /tracesSampleRate:\s*process\.env\.NODE_ENV\s*===\s*"production"\s*\?\s*0\.\d+\s*:\s*1\.0/,
    );
  });

  it("reduces profile sample rate in production only; development unchanged", () => {
    expect(clientSrc).toMatch(
      /profilesSampleRate:\s*process\.env\.NODE_ENV\s*===\s*"production"\s*\?\s*0\.\d+\s*:\s*1\.0/,
    );
  });

  it("keeps error-triggered replay at full rate", () => {
    expect(clientSrc).toMatch(/replaysOnErrorSampleRate:\s*1\.0/);
  });

  it("removes continuous JS profiling integration", () => {
    expect(clientSrc).not.toMatch(/browserProfilingIntegration\(\)/);
  });

  it("removes the Document-Policy js-profiling header from next.config.js", () => {
    expect(configSrc).not.toMatch(/key:\s*"Document-Policy"/);
    expect(configSrc).not.toMatch(/value:\s*"js-profiling"/);
  });

  it("leaves the debug-logging tree-shake setting alone", () => {
    expect(configSrc).toContain("excludeDebugStatements: true");
  });
});
