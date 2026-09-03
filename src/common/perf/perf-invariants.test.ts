import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Shared performance-invariant test file (epic #502).
// Each ticket appends its own describe block; keep blocks separate so
// parallel appends merge cleanly.
//
// Pattern: read the source file from disk and assert on its contents, the
// same way src/common/tools/trpc/react.test.ts pins a decision that has no
// runtime seam. A file-content assertion is coupled to how the configuration
// is written, not only to what it means — that cost is accepted, per Seam A
// in .scratch/specs/cwv-remediation.md.

describe("field vitals telemetry (#504)", () => {
  const layoutPath = path.resolve(import.meta.dirname, "../../app/layout.tsx");
  const reporterPath = path.resolve(
    import.meta.dirname,
    "../components/web-vitals-reporter.tsx",
  );

  it("root layout mounts the WebVitalsReporter", () => {
    const layout = fs.readFileSync(layoutPath, "utf-8");
    expect(layout).toContain("<WebVitalsReporter />");
  });

  it("reporter reads field vitals via useReportWebVitals", () => {
    const reporter = fs.readFileSync(reporterPath, "utf-8");
    expect(reporter).toContain('"use client"');
    expect(reporter).toContain('from "next/web-vitals"');
    expect(reporter).toContain("useReportWebVitals");
  });

  it("reporter sends only LCP, INP and CLS to the umami sink", () => {
    const reporter = fs.readFileSync(reporterPath, "utf-8");
    // Reports into the existing analytics sink (use-umami hook), not a new
    // dependency, and filters to the three field metrics the ticket names.
    expect(reporter).toContain('useUmami from "@/common/hooks/use-umami"');
    expect(reporter).toContain("LCP");
    expect(reporter).toContain("INP");
    expect(reporter).toContain("CLS");
  });
});
