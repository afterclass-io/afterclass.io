"use client";
import { useSession } from "next-auth/react";
import { ReviewReactionType as DbReviewReactionType } from "@prisma/client";

import { api } from "@/common/tools/trpc/react";
import { ReviewReactionType } from "@/modules/reviews/types";
import { Tag } from "@/common/components/Tag";

export const ReviewReactionsGroup = ({ reviewId }: { reviewId: string }) => {
  const { data: session } = useSession();

  const reviewReactionsQuery = api.reviewReactions.getByReviewId.useQuery({
    reviewId,
  });
  const utils = api.useUtils();
  const { mutate: upsertReaction } = api.reviewReactions.upsert.useMutation({
    onSuccess: () => {
      utils.reviewReactions.getByReviewId.refetch({ reviewId });
    },
  });

  if (!reviewReactionsQuery.data || !session) {
    return;
  }

  const reactionsMetadataMap = reviewReactionsQuery.data.reduce(
    (acc, reviewReaction) => {
      const reaction = reviewReaction.reaction;

      if (!acc[reaction]) {
        acc[reaction] = {
          count: 0,
          hasThisUserReacted: false,
        };
      }

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
          <Tag
            onClick={(e) => {
              e.stopPropagation();
              handleReactionChange(reaction as DbReviewReactionType);
            }}
            key={reaction}
            clickable
            active={hasThisUserReacted}
            className="flex min-w-fit gap-1 px-2 py-0"
            asChild
          >
            <span className="text-lg">
              {ReviewReactionType[reaction as keyof typeof ReviewReactionType]}
            </span>
            <span>{count}</span>
          </Tag>
        ),
      )}
    </div>
  );
};
