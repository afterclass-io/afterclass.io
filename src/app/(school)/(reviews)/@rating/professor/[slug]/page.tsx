import { ReviewType } from "@prisma/client";

import { auth } from "@/server/auth";
import { RatingSection } from "@/modules/reviews/components/RatingSection";
import { api } from "@/common/tools/trpc/server";
import { toTitleCase, formatPercentage } from "@/common/functions";

export default async function ProfessorRating(
  props: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{
      course?: string | string[];
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await auth();

  const validProfessorReviewLabels = await api.labels.getAllByType({
    typeOf: ReviewType.PROFESSOR,
  });

  if (!session) {
    return (
      <RatingSection
        headingRatingItem={{
          label: "Average Rating",
          rating: "-",
        }}
        ratingItems={validProfessorReviewLabels.map((label) => ({
          label: toTitleCase(label.name.replaceAll("_", " ")),
          rating: "-",
        }))}
        isLocked={!session}
      />
    );
  }

  const courseCodes = searchParams?.course
    ? Array.isArray(searchParams?.course)
      ? searchParams?.course
      : [searchParams?.course]
    : [];

  const { averageRating, reviewCount, reviewLabels } =
    await api.reviews.getMetadataForProf({
      slug: params.slug,
      withCourseCodes: courseCodes.length > 0 ? courseCodes : undefined,
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
