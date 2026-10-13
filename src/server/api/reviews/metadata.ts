import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ReviewType } from "@/generated/prisma/enums";

import { toTitleCase } from "@/common/functions";

/**
 * Average rating, review count and per-label counts for the reviews that
 * match `where`. Every label of `labelType` is listed, with 0 when unused.
 * The three queries are independent, so they run together.
 */
export async function getReviewMetadataSummary(
  db: PrismaClient,
  where: Prisma.ReviewsWhereInput,
  labelType: ReviewType,
) {
  const [aggregate, labelCounts, labels] = await Promise.all([
    db.reviews.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true },
    }),
    db.reviewLabels.groupBy({
      by: ["labelId"],
      _count: { labelId: true },
      where: { review: where },
    }),
    db.labels.findMany({ where: { typeOf: labelType } }),
  ]);

  return {
    averageRating: aggregate._avg.rating ?? 0,
    reviewCount: aggregate._count._all,
    reviewLabels: labels.map((label) => ({
      name: toTitleCase(label.name.replaceAll("_", " ")),
      count:
        labelCounts.find((labelCount) => labelCount.labelId === label.id)
          ?._count.labelId ?? 0,
    })),
  };
}
