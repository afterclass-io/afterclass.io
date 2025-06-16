import { useEdgeConfigs } from "@/common/hooks";
import { api } from "@/common/tools/trpc/react";
import { ReviewEventType } from "@prisma/client";
import { useSession } from "next-auth/react";
import { debounce } from "lodash";
import { useCallback, useMemo } from "react";

export function useOptimisticReaction() {
  const { data: session } = useSession();
  const ecfg = useEdgeConfigs();

  const utils = api.useUtils();
  const { mutate: track } = api.reviewEvents.track.useMutation();

  const mutation = api.reviewReactions.upsert.useMutation({
    onMutate: async ({ reviewId }) => {
      // Snapshot the previous value
      const previousReactions = utils.reviewReactions.getByReviewId.getData({
        reviewId,
      });
      return { previousReactions };
    },
    onSuccess: (_data, { reviewId, reaction }) => {
      if (reaction && ecfg.enableReviewEventsTracking) {
        track({
          reviewId,
          eventType: ReviewEventType.REACTION,
        });
      }
    },
    onError: (_err, { reviewId }, context) => {
      // Rollback to the previous value if mutation fails
      utils.reviewReactions.getByReviewId.setData(
        { reviewId },
        context?.previousReactions,
      );
    },
    onSettled: (_data, _err, { reviewId }) => {
      // Refetch to sync with server state after mutation completes
      void utils.reviewReactions.getByReviewId.invalidate({ reviewId });
    },
  });
  const mutate = mutation.mutate;

  const debouncedMutate = useMemo(
    () =>
      debounce((variables: Parameters<typeof mutate>[0]) => {
        mutate(variables);
      }, 300),
    [mutate],
  ); // 300 ms before mutate is called

  const applyOptimisticUpdate = useCallback(
    (variables: Parameters<typeof mutate>[0]) => {
      const { reviewId, reaction, userId } = variables;

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

          // when user has new reaction
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
    },
    [session?.user.id, utils.reviewReactions.getByReviewId],
  );

  const mutateWithDebounce = useCallback(
    (variables: Parameters<typeof mutate>[0]) => {
      applyOptimisticUpdate(variables); // immediate UI update
      debouncedMutate(variables); // debounced server mutation
    },
    [applyOptimisticUpdate, debouncedMutate],
  );

  return {
    ...mutation,
    mutate: mutateWithDebounce,
  };
}
