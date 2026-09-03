import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Source-reading invariant for #515: the roadmap timeline (and its
 * @xyflow/react dependency) must be dynamically imported at every call site,
 * with an entries-aware skeleton that mirrors the timeline's rendered box.
 */
describe("RoadmapTimeline dynamic import invariant (#515)", () => {
  const read = (rel: string) =>
    fs.readFileSync(path.resolve(import.meta.dirname, rel), "utf-8");

  const callSites: [string, string][] = [
    [
      "PublicRoadmapView.tsx",
      "../../../app/(school)/roadmaps/[id]/PublicRoadmapView.tsx",
    ],
    [
      "SharedRoadmapView.tsx",
      "../../../app/(school)/share/roadmap/[token]/SharedRoadmapView.tsx",
    ],
    ["MyRoadmapsEditor.tsx", "./MyRoadmapsEditor.tsx"],
  ];

  it.each(callSites)(
    "%s dynamically imports RoadmapTimeline with an entries-aware skeleton and no SSR",
    (_name, file) => {
      const src = read(file);
      expect(src).toContain("dynamic(");
      expect(src).toContain(
        'import("@/modules/roadmaps/components/RoadmapTimeline")',
      );
      expect(src).toMatch(/ssr:\s*false/);
      expect(src).toContain("RoadmapTimelineSkeleton");
      expect(src).not.toMatch(
        /from\s+["']@\/modules\/roadmaps\/components\/RoadmapTimeline["']/,
      );
    },
  );

  it.each(callSites)(
    "%s defaults to the grid view so the timeline is never above the fold on first paint",
    (_name, file) => {
      const src = read(file);
      expect(src).toMatch(/useState<[^>]+>\(["']grid["']\)/);
    },
  );

  it("RoadmapTimelineSkeleton mirrors the timeline's rendered box and imports no @xyflow/react", () => {
    const skeletonSrc = read("./RoadmapTimelineSkeleton.tsx");
    const timelineSrc = read("./RoadmapTimeline.tsx");
    // Base height, growth cap, and empty-state height must agree between the
    // component and its skeleton so the dynamic swap never shifts layout.
    for (const token of [
      "h-[500px]",
      "min-h-[300px]",
      "Math.min(maxY + 40, 800)",
    ]) {
      expect(skeletonSrc).toContain(token);
      expect(timelineSrc).toContain(token);
    }
    // The skeleton ships in the initial chunk — it must not drag @xyflow in.
    expect(skeletonSrc).not.toMatch(/from\s+["']@xyflow/);
  });
});
