import { formatPercentage, toTitleCase } from "@/common/functions";
import { RatingSection } from "@/modules/reviews/components/RatingSection";

type RatingMetadata = {
  averageRating: number;
  reviewCount: number;
  reviewLabels: { name: string; count: number }[];
};

/** Placeholder ratings for signed-out viewers. Only the label names are shown. */
export const LockedRatingMetadataSection = ({
  labels,
}: {
  labels: { name: string }[];
}) => {
  return (
    <RatingSection
      isLocked
      headingRatingItem={{
        label: "Average Rating",
        rating: "-",
      }}
      ratingItems={labels.map((label) => ({
        label: toTitleCase(label.name.replaceAll("_", " ")),
        rating: "-",
      }))}
    />
  );
};

export const RatingMetadataSection = ({
  metadata,
}: {
  metadata: RatingMetadata;
}) => {
  const { averageRating, reviewCount, reviewLabels } = metadata;

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
};
