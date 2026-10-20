import { type Metadata } from "next";

import { JsonLd } from "@/common/components/json-ld";
import { buildBreadcrumbJsonLd, buildCourseJsonLd } from "@/common/tools/seo";
import { HydrateClient } from "@/common/tools/trpc/server";
import { env } from "@/env";
import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
  ReviewSectionListFilter,
  ReviewSectionHeaderSortGroup,
} from "@/modules/reviews/components/ReviewSection";
import {
  LockedReviewFeed,
  ReviewItemLoader,
} from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import { getCourseByCode } from "@/modules/reviews/functions/getCourseByCode";
import { getCoursePageData } from "@/modules/reviews/functions/getCoursePageData";
import { courseDescription } from "@/modules/reviews/functions/pageDescriptions";
import { prefetchReviewFeed } from "@/modules/reviews/functions/prefetchReviewFeed";
import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";

// The SEO description and JSON-LD carry the review figures and professor count.
const COURSE_FIGURES_DOMAINS = ["courses", "professors", "reviews"] as const;

// `@reviews` is the single metadata owner for `/course/[code]`. Parallel slots
// merge in traversal order and the last writer wins, so do NOT export metadata
// from another slot for this route (the constraint is invisible here otherwise).
export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await props.params;
  const courseCode = code.toUpperCase();

  const session = await auth();
  if (!(await canViewData(session, "courses"))) {
    return {
      title: "Sign in to view this course",
      robots: { index: false, follow: false },
    };
  }

  try {
    const canonical = `/course/${courseCode}`;
    // Course data is public but the figures are not: name the course only.
    if (!(await canViewData(session, ...COURSE_FIGURES_DOMAINS))) {
      const course = await getCourseByCode(courseCode);
      if (!course)
        return {
          title: "Course not found",
          robots: { index: false, follow: false },
        };
      return {
        title: `${course.name} (${course.code})`,
        alternates: { canonical },
      };
    }

    const data = await getCoursePageData(courseCode);
    if (!data)
      return {
        title: "Course not found",
        robots: { index: false, follow: false },
      };
    const title = `${data.course.name} (${data.course.code})`;
    const description = courseDescription(data);
    return {
      title,
      description,
      // `professor`, `sort` and filter params are variants of this page, so they
      // are dropped: the bare course URL is the canonical one.
      alternates: { canonical },
      // A node's `openGraph` replaces the accumulated root block wholesale, so
      // the root-owned fields (siteName, type, locale) are re-declared here.
      openGraph: {
        title,
        description,
        siteName: "AfterClass",
        type: "website",
        locale: "en_GB",
        url: canonical,
      },
    };
  } catch {
    return {
      title: "Course not found",
      robots: { index: false, follow: false },
    };
  }
}

export default async function Course(props: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{
    professor?: string | string[];
    filter?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await auth();
  // `@header` shows the wall when `courses` itself is private.
  if (!(await canViewData(session, "courses"))) return null;
  if (!(await canViewData(session, "reviews"))) {
    return (
      <ReviewSection>
        <ReviewSectionList>
          <LockedReviewFeed />
        </ReviewSectionList>
      </ReviewSection>
    );
  }
  const [canViewProfessors, canViewFigures] = await Promise.all([
    canViewData(session, "professors"),
    canViewData(session, ...COURSE_FIGURES_DOMAINS),
  ]);

  // assuming all course codes are uppercase
  const courseCode = params.code.toUpperCase();
  // Narrowing by professor is professor data, so it needs `professors`.
  const professorSlugs = !canViewProfessors
    ? []
    : searchParams?.professor
      ? Array.isArray(searchParams?.professor)
        ? searchParams?.professor
        : [searchParams?.professor]
      : [];

  // The same request-scoped, `cache`d query `generateMetadata` runs; the two
  // calls dedupe by function identity and arguments, so this is one query.
  // The session is read here, not in the browser, so the feed is fetched once
  // under the procedure the signed-in or signed-out viewer will keep using.
  const isAuthenticated = Boolean(session);
  const slugs = professorSlugs.length > 0 ? professorSlugs : undefined;
  const [data] = await Promise.all([
    canViewFigures ? getCoursePageData(courseCode) : null,
    prefetchReviewFeed(
      { variant: "course", code: courseCode, slugs },
      searchParams ?? {},
      isAuthenticated,
    ),
  ]);

  return (
    <HydrateClient>
      {data ? (
        <>
          <JsonLd
            data={buildCourseJsonLd({
              siteUrl: env.NEXT_PUBLIC_SITE_URL,
              name: data.course.name,
              description: courseDescription(data),
              code: data.course.code,
              averageRating: data.averageRating,
              reviewCount: data.reviewCount,
            })}
          />
          <JsonLd
            data={buildBreadcrumbJsonLd({
              siteUrl: env.NEXT_PUBLIC_SITE_URL,
              name: data.course.name,
              path: `/course/${courseCode}`,
            })}
          />
        </>
      ) : null}
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
        <ReviewSectionList>
          <ReviewItemLoader
            variant="course"
            code={courseCode}
            slugs={slugs}
            isAuthenticated={isAuthenticated}
          />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="course" />
    </HydrateClient>
  );
}
