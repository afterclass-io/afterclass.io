"use client";
import { useSession } from "next-auth/react";
import { type ReviewReactionType as DbReviewReactionType } from "@prisma/client";

import { api } from "@/common/tools/trpc/react";
import { ReviewReactionType } from "@/modules/reviews/types";
import { useOptimisticReaction } from "@/modules/reviews/hooks";
import { Button } from "@/common/components/button";

export const ReviewReactionsGroup = ({ reviewId }: { reviewId: string }) => {
  const { data: session } = useSession();

  const reviewReactionsQuery = api.reviewReactions.getByReviewId.useQuery({
    reviewId,
  });

  const { mutate: upsertReaction } = useOptimisticReaction();

  if (!reviewReactionsQuery.data || !session) {
    return;
  }

  const reactionsMetadataMap = reviewReactionsQuery.data.reduce(
    (acc, reviewReaction) => {
      const reaction = reviewReaction.reaction;

      acc[reaction] ??= {
        count: 0,
        hasThisUserReacted: false,
      };

      acc[reaction].count += 1;
      acc[reaction].hasThisUserReacted =
        acc[reaction].hasThisUserReacted ||
        reviewReaction.reactingUserId === session.user.id;

      return acc;
    },
    {} as Record<string, { count: number; hasThisUserReacted: boolean }>,
  );

  const handleReactionChange = (newReaction: DbReviewReactionType) => {
    if (reactionsMetadataMap[newReaction]!.hasThisUserReacted) {
      upsertReaction({
        reviewId,
      });
    } else {
      upsertReaction({
        reviewId,
        reaction: newReaction,
      });
    }
  };

  return (
    <div className="flex gap-2">
      {Object.entries(reactionsMetadataMap).map(
        ([reaction, { count, hasThisUserReacted }]) => (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleReactionChange(reaction as DbReviewReactionType);
            }}
            key={reaction}
            variant={hasThisUserReacted ? "default" : "outline"}
            className="flex min-w-fit gap-1 rounded-full border px-2 py-0 select-none"
          >
            <span className="text-lg">
              {ReviewReactionType[reaction as keyof typeof ReviewReactionType]}
            </span>
            <span className="font-mono">{count}</span>
          </Button>
        ),
      )}
    </div>
  );
};
