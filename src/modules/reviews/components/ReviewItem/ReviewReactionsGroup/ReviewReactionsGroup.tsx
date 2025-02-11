"use client";
import { Button } from "@/common/components/Button";
import { api } from "@/common/tools/trpc/react";
import { ReviewReactionType } from "@/modules/reviews/types";

export const ReviewReactionsGroup = async ({
  reviewId,
}: {
  reviewId: string;
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const reviewReactionsQuery = api.reviewReactions.getByReviewId.useQuery({
    reviewId,
  });

  if (!reviewReactionsQuery.data) {
    return;
  }

  const groupedReactions = reviewReactionsQuery.data.reduce(
    (acc, reviewReaction) => {
      if (!acc[reviewReaction.reaction]) {
        acc[reviewReaction.reaction] = 0;
      }

      acc[reviewReaction.reaction] += 1;

      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="flex gap-1">
      {Object.entries(groupedReactions).map(([reaction, count]) => (
        <Button
          size="sm"
          variant="tertiary"
          rounded
          iconLeft={
            <span>
              {ReviewReactionType[reaction as keyof typeof ReviewReactionType]}
            </span>
          }
          onClick={handleClick}
        >
          {count}
        </Button>
      ))}
    </div>
  );
};
