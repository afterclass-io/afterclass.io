import { type Review } from "@/modules/reviews/types";
import { Profile } from "@/common/components/Profile";
import { Avatar, AvatarFallback } from "@/common/components/Avatar";

import { reviewItemTheme, type ReviewItemVariants } from "../ReviewItem.theme";
import { ReviewCreatedAt } from "../ReviewCreatedAt";
import { UserIcon } from "@/common/components/icons";

export type ReviewerGroupProps = ReviewItemVariants & {
  review: Review;
};

export const ReviewerGroup = ({ review }: ReviewerGroupProps) => {
  const { reviewerGroup } = reviewItemTheme({
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
      <span className="hidden md:block">•</span>
      <ReviewCreatedAt createdAt={review.createdAt} />
    </div>
  );
};
