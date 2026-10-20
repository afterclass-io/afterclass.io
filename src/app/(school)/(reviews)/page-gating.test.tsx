// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  canViewData: vi.fn<(session: unknown, ...domains: string[]) => boolean>(),
  getCourseByCode: vi.fn(),
  getProfessorBySlug: vi.fn(),
  getCoursePageData: vi.fn(),
  getProfessorPageData: vi.fn(),
  prefetchReviewFeed: vi.fn(),
  getAllByType: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ auth: m.auth }));
vi.mock("@/server/ecfg/public-data", () => ({
  canViewData: async (session: unknown, ...domains: string[]) =>
    m.canViewData(session, ...domains),
}));
vi.mock("@/common/tools/trpc/server", () => ({
  api: { labels: { getAllByType: m.getAllByType } },
  HydrateClient: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/modules/reviews/functions/getCourseByCode", () => ({
  getCourseByCode: m.getCourseByCode,
}));
vi.mock("@/modules/reviews/functions/getProfessorBySlug", () => ({
  getProfessorBySlug: m.getProfessorBySlug,
}));
vi.mock("@/modules/reviews/functions/getCoursePageData", () => ({
  getCoursePageData: m.getCoursePageData,
}));
vi.mock("@/modules/reviews/functions/getProfessorPageData", () => ({
  getProfessorPageData: m.getProfessorPageData,
}));
vi.mock("@/modules/reviews/functions/prefetchReviewFeed", () => ({
  prefetchReviewFeed: m.prefetchReviewFeed,
}));
vi.mock("@/modules/reviews/components/ReviewItemLoader", () => ({
  ReviewItemLoader: () => <div>review feed</div>,
}));
vi.mock("@/modules/reviews/components/ReviewModalFocused", () => ({
  ReviewModalFocused: () => null,
}));
vi.mock("@/modules/reviews/components/ReviewSection", () => ({
  ReviewSection: ({ children }: { children: React.ReactNode }) => children,
  ReviewSectionHeader: () => null,
  ReviewSectionHeaderSortGroup: () => null,
  ReviewSectionList: ({ children }: { children: React.ReactNode }) => children,
  ReviewSectionListFilter: () => null,
}));
vi.mock("@/modules/reviews/components/InformationSection/DetailCard", () => ({
  DetailCard: ({ canViewClassData }: { canViewClassData: boolean }) => (
    <div>{`detail card classData=${canViewClassData}`}</div>
  ),
}));
vi.mock("@/common/components/json-ld", () => ({ JsonLd: () => null }));
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://x.test" } }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => null,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

import CourseHeader from "./@header/course/[code]/page";
import ProfessorHeader from "./@header/professor/[slug]/page";
import CourseInfo from "./@information/course/[code]/page";
import CourseRating from "./@rating/course/[code]/page";
import ProfessorRating from "./@rating/professor/[slug]/page";
import CourseFilter from "./@filter/course/[code]/page";
import ProfessorFilter from "./@filter/professor/[slug]/page";
import CourseReviews, {
  generateMetadata as courseMetadata,
} from "./@reviews/course/[code]/page";
import ProfessorReviews, {
  generateMetadata as professorMetadata,
} from "./@reviews/professor/[slug]/page";
import Home from "./@reviews/page";

const code = { params: Promise.resolve({ code: "cs1010" }) };
const slug = { params: Promise.resolve({ slug: "lee-wei" }) };
const courseReviewProps = { ...code, searchParams: Promise.resolve({}) };
const professorReviewProps = { ...slug, searchParams: Promise.resolve({}) };

/** Anonymous viewer; only the listed domains are public. */
function publicDomains(...allowed: string[]) {
  m.canViewData.mockImplementation((_session, ...domains) =>
    domains.every((d) => allowed.includes(d)),
  );
}

const pageData = {
  course: { name: "Computing", code: "CS1010" },
  professor: { name: "Lee Wei" },
  averageRating: 4,
  reviewCount: 3,
  reviewLabels: [],
  professorCount: 1,
  courseCount: 1,
};

describe("reviews pages gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.auth.mockResolvedValue(null);
    m.getAllByType.mockResolvedValue([]);
    m.getCourseByCode.mockResolvedValue({
      id: "c1",
      code: "CS1010",
      name: "Computing",
      description: "d",
      belongToUniversity: { abbrv: "SMU" },
    });
    m.getProfessorBySlug.mockResolvedValue({
      name: "Lee Wei",
      belongToUniversity: { abbrv: "SMU" },
    });
    m.getCoursePageData.mockResolvedValue(pageData);
    m.getProfessorPageData.mockResolvedValue(pageData);
  });

  describe("everything private", () => {
    beforeEach(() => publicDomains());

    it("shows the wall once, in the header slot", async () => {
      render(await CourseHeader(code));
      expect(screen.getByText("Sign in to view course pages")).toBeVisible();
      expect(m.getCourseByCode).not.toHaveBeenCalled();
      render(await ProfessorHeader(slug));
      expect(screen.getByText("Sign in to view professor pages")).toBeVisible();
      expect(m.getProfessorBySlug).not.toHaveBeenCalled();
    });

    it("renders nothing and calls no endpoint from the other slots", async () => {
      expect(await CourseInfo(code)).toBeNull();
      expect(await CourseRating(code)).toBeNull();
      expect(await ProfessorRating(slug)).toBeNull();
      expect(await CourseFilter(code)).toBeNull();
      expect(await ProfessorFilter(slug)).toBeNull();
      expect(await CourseReviews(courseReviewProps)).toBeNull();
      expect(await ProfessorReviews(professorReviewProps)).toBeNull();
      expect(m.getCourseByCode).not.toHaveBeenCalled();
      expect(m.getCoursePageData).not.toHaveBeenCalled();
      expect(m.prefetchReviewFeed).not.toHaveBeenCalled();
      expect(m.getAllByType).not.toHaveBeenCalled();
    });

    it("noindexes course and professor metadata without reading data", async () => {
      expect(await courseMetadata(code)).toMatchObject({
        robots: { index: false, follow: false },
      });
      expect(await professorMetadata(slug)).toMatchObject({
        robots: { index: false, follow: false },
      });
      expect(m.getCoursePageData).not.toHaveBeenCalled();
      expect(m.getProfessorPageData).not.toHaveBeenCalled();
    });

    it("walls the home feed", async () => {
      render(await Home({}));
      expect(screen.getByText("Sign in to view reviews")).toBeVisible();
      expect(m.prefetchReviewFeed).not.toHaveBeenCalled();
    });
  });

  describe("catalogue public, reviews private", () => {
    beforeEach(() => publicDomains("courses", "professors"));

    it("renders the course header and walls only the review slot", async () => {
      render(await CourseHeader(code));
      expect(screen.getByRole("heading", { name: "Computing" })).toBeVisible();

      render(await CourseReviews(courseReviewProps));
      expect(screen.getByText("Sign in to view course reviews")).toBeVisible();
      expect(m.prefetchReviewFeed).not.toHaveBeenCalled();
      expect(await courseMetadata(code)).toMatchObject({
        robots: { index: false, follow: false },
      });
    });

    it("walls the professor review slot", async () => {
      render(await ProfessorReviews(professorReviewProps));
      expect(
        screen.getByText("Sign in to view professor reviews"),
      ).toBeVisible();
    });

    it("hides class data from the detail card", async () => {
      render(await CourseInfo(code));
      expect(screen.getByText("detail card classData=false")).toBeVisible();
    });
  });

  describe("everything public", () => {
    beforeEach(() =>
      publicDomains("courses", "professors", "reviews", "classData"),
    );

    it("renders the course review feed and indexable metadata", async () => {
      render(await CourseReviews(courseReviewProps));
      expect(screen.getByText("review feed")).toBeVisible();
      const metadata = await courseMetadata(code);
      expect(metadata.robots).toBeUndefined();
      expect(metadata.title).toBe("Computing (CS1010)");
    });

    it("renders the professor review feed", async () => {
      render(await ProfessorReviews(professorReviewProps));
      expect(screen.getByText("review feed")).toBeVisible();
    });

    it("renders the home feed", async () => {
      render(await Home({}));
      expect(screen.getByText("review feed")).toBeVisible();
    });

    it("passes class data visibility to the detail card", async () => {
      render(await CourseInfo(code));
      expect(screen.getByText("detail card classData=true")).toBeVisible();
    });
  });
});
