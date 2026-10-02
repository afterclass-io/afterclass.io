import { type Metadata } from "next";

import { JsonLd } from "@/common/components/json-ld";
import { buildBreadcrumbJsonLd, buildCourseJsonLd } from "@/common/tools/seo";
import { env } from "@/env";
import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
  ReviewSectionListFilter,
  ReviewSectionHeaderSortGroup,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import { getCoursePageData } from "@/modules/reviews/functions/getCoursePageData";
import { courseDescription } from "@/modules/reviews/functions/pageDescriptions";

// `@reviews` is the single metadata owner for `/course/[code]`. Parallel slots
// merge in traversal order and the last writer wins, so do NOT export metadata
// from another slot for this route (the constraint is invisible here otherwise).
export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await props.params;
  const courseCode = code.toUpperCase();

  try {
    const data = await getCoursePageData(courseCode);
    if (!data) return { title: "Course not found" };
    const title = `${data.course.name} (${data.course.code})`;
    const description = courseDescription(data);
    const canonical = `/course/${courseCode}`;
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
    return { title: "Course not found" };
  }
}

export default async function Course(props: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ professor?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  // assuming all course codes are uppercase
  const courseCode = params.code.toUpperCase();
  const professorSlugs = searchParams?.professor
    ? Array.isArray(searchParams?.professor)
      ? searchParams?.professor
      : [searchParams?.professor]
    : [];

  // The same request-scoped, `cache`d query `generateMetadata` runs; the two
  // calls dedupe by function identity and arguments, so this is one query.
  const data = await getCoursePageData(courseCode);

  return (
    <>
      {data ? (
        <>
          <JsonLd
            data={buildCourseJsonLd({
              siteUrl: env.NEXTAUTH_URL,
              name: data.course.name,
              description: courseDescription(data),
              code: data.course.code,
              averageRating: data.averageRating,
              reviewCount: data.reviewCount,
            })}
          />
          <JsonLd
            data={buildBreadcrumbJsonLd({
              siteUrl: env.NEXTAUTH_URL,
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
            slugs={professorSlugs.length > 0 ? professorSlugs : undefined}
          />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="course" />
    </>
  );
}
