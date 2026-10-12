import { ReviewType } from "@/generated/prisma/enums";

import { auth } from "@/server/auth";
import {
  LockedRatingMetadataSection,
  RatingMetadataSection,
} from "@/modules/reviews/components/RatingMetadataSection";
import { api } from "@/common/tools/trpc/server";

export default async function ProfessorRating(props: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    course?: string | string[];
  }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await auth();

  const validProfessorReviewLabels = await api.labels.getAllByType({
    typeOf: ReviewType.PROFESSOR,
  });

  if (!session) {
    return <LockedRatingMetadataSection labels={validProfessorReviewLabels} />;
  }

  const courseCodes = searchParams?.course
    ? Array.isArray(searchParams?.course)
      ? searchParams?.course
      : [searchParams?.course]
    : [];

  const metadata = await api.reviews.getMetadataForProf({
    slug: params.slug,
    withCourseCodes: courseCodes.length > 0 ? courseCodes : undefined,
  });

  return <RatingMetadataSection metadata={metadata} />;
}
