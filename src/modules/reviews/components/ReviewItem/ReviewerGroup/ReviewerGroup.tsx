import { type Review } from "@/modules/reviews/types";
import { Profile } from "@/common/components/Profile";
import { Avatar, AvatarFallback } from "@/common/components/Avatar";

import { MockedReviewLikeButton, ReviewLikeButton } from "../ReviewLikeButton";
import { reviewItemTheme, type ReviewItemVariants } from "../ReviewItem.theme";
import { ReviewCreatedAt } from "../ReviewCreatedAt";
import { UserIcon } from "@/common/components/CustomIcon";

export type ReviewerGroupProps = ReviewItemVariants & {
  review: Review;
  isMocked?: boolean;
};

export const ReviewerGroup = ({
  review,
  isMocked = false,
}: ReviewerGroupProps) => {
  const { reviewerGroup, metadataContainer } = reviewItemTheme({
    size: { initial: "sm", md: "md" },
  });

  return (
    <div className={reviewerGroup()}>
      <Profile
        name={review.username}
        icon={
          <Avatar className="h-4 w-4">
            <AvatarFallback>
              <UserIcon className="translate-y-[2px]" />
            </AvatarFallback>
          </Avatar>
        }
      />
      <div className={metadataContainer()}>
        {isMocked ? (
          <MockedReviewLikeButton
            reviewLikeCount={review.likeCount}
            size="sm"
          />
        ) : (
          <ReviewLikeButton reviewId={review.id} size="sm" />
        )}
        <ReviewCreatedAt createdAt={review.createdAt} />
      </div>
    </div>
  );
};
