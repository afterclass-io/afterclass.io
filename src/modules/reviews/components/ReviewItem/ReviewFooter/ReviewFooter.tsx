import { type Review } from "@/common/types/reviews";

import { formatNumberShortScale } from "@/common/functions";
import { EyeIcon } from "@/common/components/icons";
import { ReviewShareButton } from "../ReviewShareButton";
import { ReviewVoteGroup } from "../ReviewVoteGroup";
import { ReviewReactionsGroup } from "../ReviewReactionsGroup";
import { ReviewReactionButton } from "../ReviewReactionButton";
import { useEdgeConfigs } from "@/common/hooks";
import { ReportButton } from "@/modules/moderation/components/ReportButton";

export type ReviewFooterProps = {
  review: Review;
};

export const ReviewFooter = ({ review }: ReviewFooterProps) => {
  const ecfg = useEdgeConfigs();
  const shouldShowReviewReactions = ecfg.enableReviewReactions;

  return (
    <div className="space-y-2">
      {shouldShowReviewReactions && <ReviewReactionsGroup review={review} />}

      <div className="flex flex-wrap gap-4">
        <ReviewVoteGroup review={review} />

        {shouldShowReviewReactions && (
          <ReviewReactionButton reviewId={review.id} />
        )}

        <ReviewShareButton review={review} />

        <ReportButton surface="review" refId={review.id} />

        <div className="flex items-center gap-1.5 px-2">
          <EyeIcon className="size-4" />
          <span className="font-mono">
            {formatNumberShortScale(review.countEventViews)}
          </span>
        </div>
      </div>
    </div>
  );
};
