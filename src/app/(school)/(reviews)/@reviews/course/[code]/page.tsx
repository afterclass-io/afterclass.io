import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { api, HydrateClient } from "@/common/tools/trpc/server";
import { auth } from "@/server/auth";
import { getCachedCourse } from "@/app/(school)/(reviews)/getCachedCourse";
import { CourseStructuredData, buildEntityMetadata } from "@/modules/seo";
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
  getReviewFeedParams,
  getReviewFeedProcedure,
} from "@/modules/reviews/functions/reviewFeed";

// Exactly one slot may own metadata for this route (@reviews). Metadata items merge in traversal order and the last writer wins; splitting tags across multiple slots causes non-deterministic overriding.

const getCachedCourseMetadata = cache(async (code: string) => {
  return api.reviews.getMetadataForCourse({ code });
});

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const courseCode = params.code.toUpperCase();

  try {
    const course = await getCachedCourse(courseCode);
    if (!course) {
      return { title: "Course Not Found" };
    }

    const { averageRating, reviewCount } =
      await getCachedCourseMetadata(courseCode);

    return buildEntityMetadata({
      title: `${course.code}: ${course.name}`,
      description: `${course.code}: ${course.name} has ${reviewCount} reviews with an average rating of ${averageRating.toFixed(1)}/5 on AfterClass.`,
      canonicalPath: `/course/${course.code}`,
    });
  } catch {
    return { title: "Course Not Found" };
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
  // assuming all course codes are uppercase
  const courseCode = params.code.toUpperCase();
  const course = await getCachedCourse(courseCode);
  if (!course) {
    notFound();
  }
  const metadata = await getCachedCourseMetadata(courseCode);
  const professorSlugs = searchParams?.professor
    ? Array.isArray(searchParams.professor)
      ? searchParams.professor
      : [searchParams.professor]
    : [];

  // Resolve the session on the server and prefetch the procedure the client
  // will actually use for this session state, so hydration hits the same
  // query key and signed-in students fetch once, not twice (#516).
  const session = await auth();
  const isAuthed = !!session;
  const { filterFor, sortBy } = getReviewFeedParams(searchParams);
  const procedure = getReviewFeedProcedure("course", isAuthed);
  await api.reviews[procedure].prefetchInfinite({
    code: courseCode,
    slugs: professorSlugs.length > 0 ? professorSlugs : undefined,
    filterFor,
    sortBy,
  });

  return (
    <HydrateClient>
      <CourseStructuredData
        courseCode={course.code}
        courseName={course.name}
        courseDescription={course.description}
        averageRating={metadata.averageRating}
        reviewCount={metadata.reviewCount}
      />
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
            isAuthed={isAuthed}
          />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="course" />
    </HydrateClient>
  );
}
