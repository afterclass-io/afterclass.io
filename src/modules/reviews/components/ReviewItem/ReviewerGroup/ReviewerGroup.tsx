import { type Review } from "@/modules/reviews/types";
import { Profile } from "@/common/components/profile";
import { Avatar, AvatarFallback } from "@/common/components/avatar";

import { ReviewCreatedAt } from "../ReviewCreatedAt";
import { UserIcon } from "@/common/components/icons";

export type ReviewerGroupProps = {
  review: Review;
};

export const ReviewerGroup = ({ review }: ReviewerGroupProps) => {
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-2 self-stretch">
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
