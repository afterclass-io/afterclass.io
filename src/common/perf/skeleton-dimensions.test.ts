import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Skeleton dimension invariants (#519). Source-reading assertions following
// the perf-invariants pattern (Seam A): each loading skeleton must keep the
// measured height of the rendered content it replaces, so the loading→settled
// swap does not reflow the page. All numbers below were measured from the
// current rendered components (classNames + Tailwind v4 line-heights, md
// breakpoint) before any skeleton was edited — see the measurement table in
// the #519 report.
//
// CLS deltas recorded here are class-level (px), not field CLS; a real
// before/after Lighthouse run is tracked in the ticket TODO, never fabricated.

const reviewItemSkeletonPath = path.resolve(
  import.meta.dirname,
  "../../modules/reviews/components/ReviewItem/ReviewItemSkeleton.tsx",
);

describe("skeleton dimensions (#519)", () => {
  describe("ReviewItemSkeleton (feed card)", () => {
    const src = fs.readFileSync(reviewItemSkeletonPath, "utf-8");

    it("keeps the rendered header height (two h-[24px] bars)", () => {
      expect(src).toContain('className="h-[24px] w-[100px]"');
      expect(src).toContain('className="h-[24px] w-[200px]"');
    });

    it("matches ReviewBody: rating row (5 × 16px hearts + gaps = w-24 h-4) + label row (24px) + 3-line text", () => {
      // ReviewRatingGroup renders 5 hearts at iconSize=16 → 80px + 4×4px gaps
      // = 96px (w-24) × 16px (h-4) row.
      expect(src).toContain('className="h-4 w-24"');
      // ReviewLabelGroup rows are text-base (24px line-height).
      expect(src).toContain('className="h-[24px] w-[64px]"');
      expect(src).toContain('className="h-[24px] w-[96px]"');
      // Body gaps match rendered ReviewBody (gap-2), not the old gap-1.
      expect(src).toContain("flex flex-col gap-2");
    });

    it("matches the ReviewFooter vote row (~36px, h-9)", () => {
      // VoteGroup h-8 pill, ReviewReactionButton size-9, share h-8: row ≈ 36px.
      expect(src).toContain('className="h-9 w-24 rounded-full"');
      expect(src).toContain('className="size-9 rounded-full"');
      expect(src).toContain('className="h-9 w-16"');
    });
  });

  describe("stat-item.tsx value height", () => {
    const src = fs.readFileSync(
      path.resolve(import.meta.dirname, "../components/stat-item.tsx"),
      "utf-8",
    );

    it("vertical value box matches rendered text-2xl (32px = h-8)", () => {
      expect(src).toContain('className="h-8 w-[130px]"');
    });

    it("horizontal value box matches rendered text-3xl (36px = h-9)", () => {
      expect(src).toContain('className="h-9 w-[54.4px]"');
    });

    it("does not invent a fixed width on the rendered value (no w-12 anywhere)", () => {
      expect(src).not.toContain("w-12");
    });
  });

  describe("InformationCardSkeleton", () => {
    const src = fs.readFileSync(
      path.resolve(
        import.meta.dirname,
        "../../modules/reviews/components/InformationSection/InformationCard/InformationCardSkeleton.tsx",
      ),
      "utf-8",
    );

    it("wrapper keeps h-full like the rendered InformationCard", () => {
      expect(src).toContain("flex h-full w-full flex-col");
    });

    it("description skeleton matches line-clamp-6 leading-5 (6 × 20px = 120px)", () => {
      expect(src).toContain('className="h-[120px] w-full"');
    });

    it("reserves the child row (LoginButton / Modal trigger, Button h-9 = 36px)", () => {
      expect(src).toContain('className="h-9 w-24"');
    });
  });

  describe("DetailCardSkeleton", () => {
    const src = fs.readFileSync(
      path.resolve(
        import.meta.dirname,
        "../../modules/reviews/components/InformationSection/DetailCard/DetailCardSkeleton.tsx",
      ),
      "utf-8",
    );

    it("rows match rendered md:text-lg (28px = h-7, 24px = h-6 on mobile)", () => {
      expect(src).toContain('className="h-6 w-full md:h-7"');
      expect(src).toContain('className="h-6 w-40 md:h-7"');
    });

    it("includes the bidding block: divider + text-sm label/link (20px) + text-xs count (16px)", () => {
      expect(src).toContain('<hr className="border-border" />');
      expect(src).toContain('className="h-5 w-24"');
      expect(src).toContain('className="h-5 w-44"');
      expect(src).toContain('className="h-4 w-36"');
    });
  });

  describe("PublicRoadmapsGallery card skeleton", () => {
    const src = fs.readFileSync(
      path.resolve(
        import.meta.dirname,
        "../../modules/roadmaps/components/PublicRoadmapsGallery.tsx",
      ),
      "utf-8",
    );

    it("card skeleton is h-52 (208px ≈ rendered Card 194–210px)", () => {
      expect(src).toContain('className="h-52 rounded-lg"');
    });
  });

  describe("@header loading title", () => {
    const headerLoadingPaths = [
      path.resolve(
        import.meta.dirname,
        "../../app/(school)/(reviews)/@header/course/loading.tsx",
      ),
      path.resolve(
        import.meta.dirname,
        "../../app/(school)/(reviews)/@header/professor/loading.tsx",
      ),
    ];

    for (const filePath of headerLoadingPaths) {
      it(`${path.basename(path.dirname(filePath))} title skeleton matches PageTitle text-lg (28px) / md:text-3xl (36px)`, () => {
        const src = fs.readFileSync(filePath, "utf-8");
        expect(src).toContain('className="h-7 w-[200px] md:h-9"');
      });
    }
  });
});
