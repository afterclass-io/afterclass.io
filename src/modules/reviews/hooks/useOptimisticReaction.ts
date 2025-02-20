import { useEdgeConfigs } from "@/common/hooks";
import { api } from "@/common/tools/trpc/react";
import { ReviewEventType } from "@prisma/client";
import { useSession } from "next-auth/react";

export function useOptimisticReaction() {
  const { data: session } = useSession();
  const ecfg = useEdgeConfigs();

  const utils = api.useUtils();
  const { mutate: track } = api.reviewEvents.track.useMutation();

  return api.reviewReactions.upsert.useMutation({
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
          const reactingUserId = userId ?? session?.user.id ?? "";

          // when user undo their reaction
          if (!reaction) {
            return oldQueryData?.filter(
              (reaction) => reaction.reactingUserId !== reactingUserId,
            );
          }

          const now = new Date();
          const newReaction = {
            reaction: reaction,
            reactingUserId,
            reviewId,
            createdAt: now,
            updatedAt: now,
          };

          // when there are no other reactions on this review
          if (!oldQueryData) return [newReaction];

          // remove the other reaction by the same user if it exists
          const updatedReactions = oldQueryData.filter(
            (reaction) => reaction.reactingUserId !== reactingUserId,
          );

          return [...updatedReactions, newReaction];
        },
      );

      // Return a context object with the snapshotted value
      return { previousReactions };
    },
    onError: (_err, { reviewId }, context) => {
      // Rollback to the previous value if mutation fails
      utils.reviewReactions.getByReviewId.setData(
        { reviewId },
        context?.previousReactions,
      );
    },
    onSuccess: (_data, { reviewId, reaction }) => {
      if (reaction && ecfg.enableReviewEventsTracking) {
        track({
          reviewId,
          eventType: ReviewEventType.REACTION,
        });
      }
    },
    onSettled: (_data, _err, { reviewId }) => {
      void utils.reviewReactions.getByReviewId.invalidate({ reviewId });
    },
  });
}
