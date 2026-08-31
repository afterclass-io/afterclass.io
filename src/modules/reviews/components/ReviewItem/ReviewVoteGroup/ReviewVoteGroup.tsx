"use client";
import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ReviewEventType } from "@/generated/prisma/enums";

import { api } from "@/common/tools/trpc/react";
import type { RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { useEdgeConfigs } from "@/common/hooks";
import { VoteGroup } from "@/common/components/vote-group";
import { debounce } from "@/common/functions/debounce";

export const ReviewVoteGroup = ({ reviewId }: { reviewId: string }) => {
  const { data: session } = useSession();
  const ecfg = useEdgeConfigs();

  const utils = api.useUtils();
  const { mutate: track } = api.reviewEvents.track.useMutation();
  const reviewVotesCountQuery = api.reviewVotes.count.useQuery({ reviewId });
  const getUserVoteQuery = api.reviewVotes.getByUser.useQuery({ reviewId });

  const mutation = api.reviewVotes.voteOrUnvote.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["reviewVotes"]["voteOrUnvote"],
      { previousCount?: number; previousUserVote?: { weight: number } | null }
    >({
      cancel: async () => {
        await utils.reviewVotes.count.cancel({ reviewId });
        await utils.reviewVotes.getByUser.cancel({ reviewId });
      },
      getSnapshot: () => ({
        previousCount: utils.reviewVotes.count.getData({ reviewId }),
        previousUserVote: utils.reviewVotes.getByUser.getData({ reviewId }),
      }),
      // Pattern A: the caller (mutateWithDebounce) already applied the
      // optimistic update — re-applying here would double-count.
      applyOptimistic: () => {
        /* Pattern A: caller (mutateWithDebounce) already applied */
      },
      restoreSnapshot: (prev) => {
        utils.reviewVotes.count.setData({ reviewId }, prev?.previousCount);
        utils.reviewVotes.getByUser.setData({ reviewId }, prev?.previousUserVote as never);
      },
      invalidate: async () => {
        await utils.reviewVotes.count.invalidate({ reviewId });
        await utils.reviewVotes.getByUser.invalidate({ reviewId });
      },
    }),
    onSuccess: (_, { weight }) => {
      if (ecfg.enableReviewEventsTracking) {
        const eventType = weight > 0 ? ReviewEventType.UPVOTE : ReviewEventType.DOWNVOTE;

        track({ reviewId, eventType });
      }
    },
  });
  const likeOrUnlike = mutation.mutate;

  const debouncedLikeOrUnlike = useMemo(
    () =>
      debounce((variables: Parameters<typeof likeOrUnlike>[0]) => {
        likeOrUnlike(variables);
      }, 300),
    [likeOrUnlike],
  ); // 300 ms before likeOrUnlike is called

  const applyOptimisticUpdate = useCallback(
    (variables: Parameters<typeof likeOrUnlike>[0]) => {
      const { reviewId, weight } = variables;

      // Snapshot the previous value
      const previousUserVote = utils.reviewVotes.getByUser.getData({
        reviewId,
      });

      // Optimistically update vote count
      utils.reviewVotes.count.setData({ reviewId }, (oldQueryData: number | undefined) => {
        const prevVoteCount = oldQueryData ?? 0;

        if (previousUserVote?.weight) {
          if (weight === 0) {
            // user undid their vote
            return prevVoteCount - previousUserVote.weight;
          }
          // user changed their vote
          return prevVoteCount + weight * 2;
        }
        // user voted for the first time
        return prevVoteCount + weight;
      });

      // Optimistically update user weight
      utils.reviewVotes.getByUser.setData({ reviewId }, (oldQueryData) => {
        if (!oldQueryData) return null;
        return {
          ...oldQueryData,
          weight,
        };
      });
    },
    [utils.reviewVotes.count, utils.reviewVotes.getByUser],
  );

  const mutateWithDebounce = useCallback(
    (variables: Parameters<typeof likeOrUnlike>[0]) => {
      applyOptimisticUpdate(variables); // immediate UI update
      debouncedLikeOrUnlike(variables); // debounced server mutation
    },
    [applyOptimisticUpdate, debouncedLikeOrUnlike],
  );

  const getUserVoteWeight = useCallback(() => {
    if (getUserVoteQuery.data) {
      return getUserVoteQuery.data.weight;
    }
    return 0;
  }, [getUserVoteQuery.data]);

  return (
    <VoteGroup
      upvotes={reviewVotesCountQuery.data ?? 0}
      downvotes={0}
      upvoted={getUserVoteWeight() > 0}
      downvoted={getUserVoteWeight() < 0}
      onVoteChange={({ upvoted, downvoted }) => {
        if (!session) return;
        mutateWithDebounce({
          reviewId,
          weight: upvoted ? 1 : downvoted ? -1 : 0,
        });
      }}
    />
  );
};
