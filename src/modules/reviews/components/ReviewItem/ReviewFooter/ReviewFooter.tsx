import { type Review } from "@/modules/reviews/types";

import { buttonTheme } from "@/common/components/Button";
import { EyeIcon } from "@/common/components/CustomIcon";
import { ReviewShareButton } from "../ReviewShareButton";
import { ReviewVoteGroup } from "../ReviewVoteGroup";
import { formatNumberShortScale } from "@/common/functions";

export type ReviewFooterProps = {
  review: Review;
};

export const ReviewFooter = ({ review }: ReviewFooterProps) => {
  return (
    <div className="flex gap-4">
      <ReviewVoteGroup reviewId={review.id} />

      <ReviewShareButton reviewId={review.id} variant="tertiary" size="sm" />

      <div
        className={buttonTheme({
          size: "sm",
          variant: "ghost",
          rounded: true,
          className: "after:content-none hover:bg-transparent",
        })}
      >
        <EyeIcon className="h-4 w-4" />
        <span>{formatNumberShortScale(review.countEventViews)}</span>
      </div>
    </div>
  );
};
