import { api } from "@/common/tools/trpc/server";
import {
  LockedRatingMetadataSection,
  RatingMetadataSection,
} from "@/modules/reviews/components/RatingMetadataSection";
import { ReviewType } from "@/generated/prisma/enums";
import { auth } from "@/server/auth";

export default async function CourseRating(props: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ professor?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await auth();
  const validCourseReviewLabels = await api.labels.getAllByType({
    typeOf: ReviewType.COURSE,
  });
  if (!session) {
    return <LockedRatingMetadataSection labels={validCourseReviewLabels} />;
  }

  // assuming all course codes are uppercase
  const courseCode = params.code.toUpperCase();
  const professorSlugs = searchParams?.professor
    ? Array.isArray(searchParams?.professor)
      ? searchParams?.professor
      : [searchParams?.professor]
    : [];

  const metadata = await api.reviews.getMetadataForCourse({
    code: courseCode,
    withProfSlugs: professorSlugs.length > 0 ? professorSlugs : undefined,
  });

  return <RatingMetadataSection metadata={metadata} />;
}
