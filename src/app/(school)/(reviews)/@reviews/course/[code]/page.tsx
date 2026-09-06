import { cache } from "react";
import type { Metadata } from "next";

import { api } from "@/common/tools/trpc/server";
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
import {
  JsonLd,
  createCourseJsonLd,
  createBreadcrumbJsonLd,
} from "@/common/components/json-ld";

// CONSTRAINT (SEO): Exactly one parallel-route slot may own metadata for this route (@reviews).

const getCourseData = cache(async (code: string) => {
  const course = await api.courses.getByCourseCode({ code });
  if (!course) return null;
  const reviewMetadata = await api.reviews
    .getMetadataForCourse({ code })
    .catch(() => null);
  return {
    course,
    reviewMetadata: reviewMetadata ?? {
      averageRating: 0,
      reviewCount: 0,
      reviewLabels: [],
    },
  };
});

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await props.params;
  const courseCode = code?.toUpperCase();
  if (!courseCode) {
    return { title: "Course Not Found" };
  }

  try {
    const data = await getCourseData(courseCode);
    if (!data?.course) {
      return { title: "Course Not Found" };
    }

    const { course, reviewMetadata } = data;
    const title = `${course.code}: ${course.name}`;
    const reviewCount = reviewMetadata.reviewCount;
    const description =
      reviewCount > 0
        ? `Read ${reviewCount} review${reviewCount === 1 ? "" : "s"} for ${course.name} with an average rating of ${reviewMetadata.averageRating.toFixed(2)}/5.`
        : `Read reviews and ratings for ${course.name} at AfterClass.`;

    return {
      title,
      description,
      alternates: {
        canonical: `/course/${courseCode}`,
      },
      openGraph: {
        title,
        description,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "Course Not Found" };
  }
}

export default async function Course(
  props: {
    params: Promise<{ code: string }>;
    searchParams?: Promise<{ professor?: string | string[] }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  // assuming all course codes are uppercase
  const courseCode = params.code?.toUpperCase() ?? "";
  const professorSlugs = searchParams?.professor
    ? Array.isArray(searchParams?.professor)
      ? searchParams?.professor
      : [searchParams?.professor]
    : [];

  const data = await getCourseData(courseCode);
  const baseUrl = (env.NEXT_PUBLIC_SITE_URL ?? "https://afterclass.io").replace(/\/$/, "");

  const courseJsonLd = data?.course
    ? createCourseJsonLd(data.course, data.reviewMetadata, baseUrl)
    : null;
  const breadcrumbsJsonLd = data?.course
    ? createBreadcrumbJsonLd([
        { name: "Home", url: `${baseUrl}/` },
        { name: data.course.name, url: `${baseUrl}/course/${data.course.code}` },
      ])
    : null;

  return (
    <>
      {courseJsonLd && <JsonLd data={courseJsonLd} />}
      {breadcrumbsJsonLd && <JsonLd data={breadcrumbsJsonLd} />}
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
