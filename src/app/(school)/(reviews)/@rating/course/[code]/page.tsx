import { api } from "@/common/tools/trpc/server";
import { RatingSection } from "@/modules/reviews/components/RatingSection";
import { ReviewType } from "@prisma/client";
import { auth } from "@/server/auth";
import { toTitleCase, formatPercentage } from "@/common/functions";

export default async function CourseRating({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams?: { professor?: string | string[] };
}) {
  const session = await auth();
  const validCourseReviewLabels = await api.labels.getAllByType({
    typeOf: ReviewType.COURSE,
  });
  if (!session) {
    return (
      <RatingSection
        isLocked
        headingRatingItem={{
          label: "Average Rating",
          rating: "-",
        }}
        ratingItems={validCourseReviewLabels.map((label) => ({
          label: toTitleCase(label.name.replaceAll("_", " ")),
          rating: "-",
        }))}
      />
    );
  }

  // assuming all course codes are uppercase
  const courseCode = params.code.toUpperCase();
  const professorSlugs = searchParams?.professor
    ? Array.isArray(searchParams.professor)
      ? searchParams.professor
      : [searchParams.professor]
    : [];

  const { averageRating, reviewCount, reviewLabels } =
    await api.reviews.getMetadataForCourse({
      code: courseCode,
      withProfSlugs: professorSlugs.length > 0 ? professorSlugs : undefined,
    });

  if (reviewCount === 0) {
    return (
      <RatingSection
        headingRatingItem={{
          label: "Average Rating",
          rating: "-",
        }}
        ratingItems={[]}
      />
    );
  }

  return (
    <RatingSection
      headingRatingItem={{
        label: "Average Rating",
        rating: averageRating.toFixed(2),
      }}
      ratingItems={reviewLabels.map((label) => ({
        label: toTitleCase(label.name),
        rating: formatPercentage(label.count && label.count / reviewCount),
      }))}
    />
  );
}
