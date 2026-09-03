import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Source-reading invariant for #515: the bid chart (and its recharts
 * dependency) must be dynamically imported at every call site so it never
 * ships in the initial bundle of pages that don't open a chart. Same pattern
 * as src/common/tools/trpc/react.test.ts.
 */
describe("BidChart dynamic import invariant (#515)", () => {
  const read = (rel: string) =>
    fs.readFileSync(path.resolve(import.meta.dirname, rel), "utf-8");

  const callSites: [string, string][] = [
    ["BidAnalyticsClient.tsx", "./BidAnalyticsClient.tsx"],
    ["ModAlternativesClientWrapper.tsx", "./ModAlternativesClientWrapper.tsx"],
  ];

  it.each(callSites)(
    "%s dynamically imports BidChart instead of statically importing it",
    (_name, file) => {
      const src = read(file);
      expect(src).toContain("dynamic(");
      expect(src).toContain('import("@/modules/bidding/components/BidChart")');
      expect(src).not.toMatch(
        /from\s+["']@\/modules\/bidding\/components\/BidChart["']/,
      );
    },
  );

  it("BidAnalyticsClient disables SSR for the chart and uses an aspect-video skeleton", () => {
    const src = read("./BidAnalyticsClient.tsx");
    expect(src).toMatch(/ssr:\s*false/);
    // ChartContainer renders the chart at 16:9; the skeleton must match that
    // box so the swap does not shift layout.
    expect(src).toMatch(/aspect-video/);
  });

  it("sortChartData lives in utils (not BidChart) so static imports never pull recharts", () => {
    const bidChartSrc = read("./BidChart.tsx");
    const sortSrc = read("../utils/sort-chart-data.ts");
    expect(bidChartSrc).not.toContain("export function sortChartData");
    expect(sortSrc).toContain("export function sortChartData");
    expect(sortSrc).not.toMatch(/from\s+["']recharts["']/);
  });

  it("BidAnalyticsClient imports sortChartData from utils", () => {
    const src = read("./BidAnalyticsClient.tsx");
    expect(src).toMatch(
      /import\s*\{[^}]*sortChartData[^}]*\}\s*from\s*["']@\/modules\/bidding\/utils\/sort-chart-data["']/,
    );
  });

  it("ChartContainer renders the chart at aspect-video, which the skeleton height mirrors", () => {
    const chartSrc = read("../../../common/components/chart.tsx");
    expect(chartSrc).toMatch(/aspect-video/);
  });
});
