import { type Review } from "@/common/types/reviews";

import { ReviewerGroup } from "./ReviewerGroup";
import { RevieweeGroup } from "./RevieweeGroup";
import { ReviewBody } from "./ReviewBody";
import { ReviewFooter } from "./ReviewFooter";
import { ReviewModal } from "./ReviewModal";
import { ReviewItemViewEventTracker } from "../ReviewItemViewEventTracker";

export type ReviewItemProps = {
  review: Review;
  variant?: "home" | "professor" | "course";
  isMocked?: boolean; // for testing purposes only
  seeMore?: boolean;
};

export const ReviewItem = ({
  review,
  variant = "home",
  isMocked = false,
  seeMore,
}: ReviewItemProps) => {
  const reviewHeader = (
    <div className="flex flex-col content-center gap-3 self-stretch overflow-hidden md:flex-row-reverse md:justify-between">
      <ReviewerGroup review={review} />
      <RevieweeGroup review={review} variant={variant} />
    </div>
  );

  return (
    <ReviewModal review={review} variant={variant} seeMore={seeMore}>
      <div
        className="focus-ring hover:bg-accent flex h-fit max-w-prose cursor-pointer flex-col items-start gap-2 rounded-md p-4 text-left md:gap-4"
        data-test="review"
      >
        {reviewHeader}
        <ReviewBody review={review} />
        <ReviewFooter review={review} />
        {!isMocked && <ReviewItemViewEventTracker reviewId={review.id} />}
      </div>
    </ReviewModal>
  );
};
