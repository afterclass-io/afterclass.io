import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Loading boundaries for the five data-heavy routes (#523). Source-reading
// assertions following the skeleton-dimensions (#519) pattern: every skeleton
// height comes from the measured set (PageTitle 28/36px = h-7/md:h-9, Button
// h-9 = 36px, text rows h-6/h-5/h-4 = 24/20/16px, ToggleGroupItem h-10,
// Combobox trigger min-h-12, roadmap card h-52 = 208px) — no arbitrary
// heights, no competing skeleton components.
//
// TTFB/TTFC before/after per route: not measurable in this environment (no
// production build + DB + Lighthouse CLI — same limitation as the #504
// baseline). Follow the procedure in `.scratch/specs/cwv-baseline.md`
// (Lighthouse mobile preset, 3 runs, median) and record the numbers there.

const LOADING_ROUTES = {
  bidding: "./bidding/loading.tsx",
  "bidding/analytics": "./bidding/analytics/loading.tsx",
  search: "./search/loading.tsx",
  roadmaps: "./roadmaps/loading.tsx",
  submit: "./submit/loading.tsx",
} as const;

describe("data-heavy route loading boundaries (#523)", () => {
  it.each(Object.entries(LOADING_ROUTES))(
    "%s route has a loading boundary",
    (_route, relativePath) => {
      expect(
        fs.existsSync(path.resolve(import.meta.dirname, relativePath)),
      ).toBe(true);
    },
  );

  it.each(Object.entries(LOADING_ROUTES))(
    "%s shell sizes skeletons from the measured #519 scale only",
    (_route, relativePath) => {
      const src = fs.readFileSync(
        path.resolve(import.meta.dirname, relativePath),
        "utf-8",
      );
      // A real streaming shell built on the measured Skeleton primitive.
      expect(src).toContain("Skeleton");
      // No arbitrary heights: the whole skeleton-sizing risk (#519) was
      // closed by measuring; any new h-[...] would be an unmeasured guess.
      expect(src).not.toMatch(/h-\[/);
    },
  );

  describe("reuses the measured skeleton dimensions", () => {
    const read = (route: keyof typeof LOADING_ROUTES) =>
      fs.readFileSync(
        path.resolve(import.meta.dirname, LOADING_ROUTES[route]),
        "utf-8",
      );

    it("roadmaps: card skeleton h-52 (208px ≈ rendered Card 194–210px) + PageTitle h-7 md:h-9", () => {
      const src = read("roadmaps");
      expect(src).toContain('className="h-52 rounded-lg"');
      expect(src).toContain('className="h-7 w-[200px] md:h-9"');
    });

    it("submit: PageTitle h-7 md:h-9 + textarea min-h-16 (rendered Textarea class)", () => {
      const src = read("submit");
      expect(src).toContain('className="h-7 w-[200px] md:h-9"');
      expect(src).toContain("min-h-16");
    });

    it("search: PageTitle h-7 md:h-9 + filter pills h-10 (rendered ToggleGroupItem)", () => {
      const src = read("search");
      expect(src).toContain("h-7");
      expect(src).toContain("md:h-9");
      expect(src).toContain('className="h-10 w-20"');
    });

    it("bidding: Combobox triggers min-h-12 + ClassCard rows (h-7 code, h-5 timings, h-4 venue)", () => {
      const src = read("bidding");
      expect(src).toContain("min-h-12");
      expect(src).toContain('className="h-7 w-16"');
      expect(src).toContain('className="h-5 w-32"');
      expect(src).toContain('className="h-4 w-24"');
    });

    it("bidding/analytics: chart aspect-video (16:9, #515) + Button h-9 + text rows", () => {
      const src = read("bidding/analytics");
      expect(src).toContain("aspect-video");
      expect(src).toContain('className="h-9 w-32"');
      expect(src).toContain('className="h-5 w-full"');
      expect(src).toContain('className="h-4 w-full"');
    });
  });
});
