import { type Review } from "@/modules/reviews/types";

import { ReviewRatingGroup } from "../ReviewRatingGroup";
import { ReviewLabelGroup } from "../ReviewLabelGroup";

export type ReviewBodyProps = {
  review: Review;
  variant?: "home" | "subpage";
};

export const ReviewBody = ({ review }: ReviewBodyProps) => {
  return (
    <div className="flex flex-col gap-2">
      <ReviewRatingGroup rating={review.rating} />
      <ReviewLabelGroup reviewLabels={review.reviewLabels} />
      <div className="text-accent-foreground line-clamp-5 wrap-anywhere md:line-clamp-3 md:text-sm">
        {review.body}
      </div>
    </div>
  );
};
