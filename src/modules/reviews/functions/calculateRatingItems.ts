import type { Review } from "@/modules/reviews/types";
import type { Labels } from "@/generated/prisma/client";
import { formatPercentage } from "@/common/functions";

export default function calculateRatingItems(
  reviews: Review[],
  labels: Labels[],
) {
  return labels.map((label) => {
    const reviewsWithThisLabel = reviews.filter((r) =>
      r.reviewLabels.map((rl) => rl.name).includes(label.name),
    );
    return {
      label: label.name.replaceAll("_", " ").toLowerCase(),
      rating: formatPercentage(reviewsWithThisLabel.length / reviews.length),
    };
  });
}
