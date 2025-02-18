"use client";
import { useSession } from "next-auth/react";
import {
  ReviewReactionType as DbReviewReactionType,
  ReviewEventType,
} from "@prisma/client";

import { api } from "@/common/tools/trpc/react";
import { Tag } from "@/common/components/Tag";
import { useEdgeConfigs } from "@/common/hooks";
import { ReviewReactionType } from "@/modules/reviews/types";

export const ReviewReactionsGroup = ({ reviewId }: { reviewId: string }) => {
  const { data: session } = useSession();
  const ecfg = useEdgeConfigs();

  const reviewReactionsQuery = api.reviewReactions.getByReviewId.useQuery({
    reviewId,
  });
  const utils = api.useUtils();
  const { mutate: track } = api.reviewEvents.track.useMutation();
  const { mutate: upsertReaction } = api.reviewReactions.upsert.useMutation({
    onMutate: async ({ reviewId, reaction, userId }) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await utils.reviewReactions.getByReviewId.cancel();

      // Snapshot the previous value
      const previousReactions = utils.reviewReactions.getByReviewId.getData({
        reviewId,
      });

      // Optimistically update to the new value
      utils.reviewReactions.getByReviewId.setData(
        { reviewId },
        (oldQueryData) => {
          const now = new Date();
          const newReaction = {
            reaction: reaction as DbReviewReactionType,
            reactingUserId: userId ?? session?.user.id ?? "",
            reviewId,
            createdAt: now,
            updatedAt: now,
          };

          if (!oldQueryData) return [newReaction];

          // Remove the previous reaction if it exists
          const updatedReactions = oldQueryData.filter(
            (reaction) =>
              reaction.reactingUserId !== newReaction.reactingUserId,
          );

          return [...updatedReactions, newReaction];
        },
      );

      // Return a context object with the snapshotted value
      return { previousReactions };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value if mutation fails
      utils.reviewReactions.getByReviewId.setData(
        { reviewId },
        context?.previousReactions,
      );
    },
    onSuccess: (_, { userId }) => {
      if (ecfg.enableReviewEventsTracking) {
        const triggeringUserId = userId ?? session?.user.id;

        track({
          reviewId,
          triggeringUserId,
          eventType: ReviewEventType.REACTION,
        });
      }
    },
    onSettled: () => {
      void utils.reviewReactions.getByReviewId.invalidate({ reviewId });
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
