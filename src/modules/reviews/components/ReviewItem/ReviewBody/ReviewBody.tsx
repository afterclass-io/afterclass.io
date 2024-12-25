import { type Review } from "@/modules/reviews/types";

import { reviewItemTheme, type ReviewItemVariants } from "../ReviewItem.theme";
import { ReviewRatingGroup } from "../ReviewRatingGroup";
import { ReviewLabelGroup } from "../ReviewLabelGroup";

export type ReviewBodyProps = ReviewItemVariants & {
  review: Review;
  variant?: "home" | "subpage";
};

export const ReviewBody = ({ review }: ReviewBodyProps) => {
  const { body } = reviewItemTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className="flex flex-col gap-2">
      <ReviewRatingGroup rating={review.rating} />
      <ReviewLabelGroup reviewLabels={review.reviewLabels} />
      <div className={body()}>{review.body}</div>
    </div>
  );
};
