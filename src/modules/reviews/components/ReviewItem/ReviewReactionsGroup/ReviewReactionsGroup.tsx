"use client";
import { useSession } from "next-auth/react";

import { Button } from "@/common/components/Button";
import { api } from "@/common/tools/trpc/react";
import { ReviewReactionType } from "@/modules/reviews/types";

export const ReviewReactionsGroup = ({ reviewId }: { reviewId: string }) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const { data: session } = useSession();

  const reviewReactionsQuery = api.reviewReactions.getByReviewId.useQuery({
    reviewId,
  });

  if (!reviewReactionsQuery.data || !session) {
    return;
  }

  const groupedReactions = reviewReactionsQuery.data.reduce(
    (acc, reviewReaction) => {
      const reaction = reviewReaction.reaction;

      if (!acc[reaction]) {
        acc[reaction] = {
          count: 0,
          hasThisUserReacted: reviewReaction.reactingUserId === session.user.id,
        };
      }

      acc[reaction].count += 1;

      return acc;
    },
    {} as Record<string, { count: number; hasThisUserReacted: boolean }>,
  );

  return (
    <div className="flex gap-1">
      {Object.entries(groupedReactions).map(
        ([reaction, { count, hasThisUserReacted }]) => (
          <Button
            size="sm"
            variant={hasThisUserReacted ? "secondary" : "tertiary"}
            rounded
            iconLeft={
              <span className="mx-[-2px] flex h-full w-fit items-center text-base">
                {
                  ReviewReactionType[
                    reaction as keyof typeof ReviewReactionType
                  ]
                }
              </span>
            }
            onClick={handleClick}
          >
            {count}
          </Button>
        ),
      )}
    </div>
  );
};
