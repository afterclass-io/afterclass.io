"use client";
import { useSession } from "next-auth/react";
import { type ReviewReactionType as DbReviewReactionType } from "@/generated/prisma/enums";

import { ReviewReactionType, type Review } from "@/common/types/reviews";
import { useOptimisticReaction } from "@/modules/reviews/hooks";
import { Button } from "@/common/components/button";

export const ReviewReactionsGroup = ({ review }: { review: Review }) => {
  const { data: session } = useSession();
  const { mutate: upsertReaction } = useOptimisticReaction();

  const reactionCounts = review.engagement?.reactionCounts;
  const viewerReaction = review.engagement?.viewerReaction;

  if (!reactionCounts || reactionCounts.length === 0 || !session) {
    return null;
  }

  const handleReactionChange = (newReaction: DbReviewReactionType) => {
    if (viewerReaction === newReaction) {
      upsertReaction({
        reviewId: review.id,
      });
    } else {
      upsertReaction({
        reviewId: review.id,
        reaction: newReaction,
      });
    }
  };

  return (
    <div className="flex gap-2 overflow-auto">
      {reactionCounts.map(({ reaction, count }) => {
        const hasThisUserReacted = viewerReaction === reaction;
        return (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleReactionChange(reaction);
            }}
            key={reaction}
            variant={hasThisUserReacted ? "default" : "outline"}
            className="flex min-w-fit cursor-pointer gap-1 rounded-full border px-2 py-0 select-none"
          >
            <span className="text-lg">{ReviewReactionType[reaction]}</span>
            <span className="font-mono">{count}</span>
          </Button>
        );
      })}
    </div>
  );
};
