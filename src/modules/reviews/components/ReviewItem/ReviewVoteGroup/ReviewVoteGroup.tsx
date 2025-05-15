"use client";
import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { ReviewEventType } from "@prisma/client";

import { api } from "@/common/tools/trpc/react";
import { useEdgeConfigs } from "@/common/hooks";
import { VoteGroup } from "@/common/components/vote-group";

export const ReviewVoteGroup = ({ reviewId }: { reviewId: string }) => {
  const { data: session } = useSession();
  const ecfg = useEdgeConfigs();

  const utils = api.useUtils();
  const { mutate: track } = api.reviewEvents.track.useMutation();
  const reviewVotesCountQuery = api.reviewVotes.count.useQuery({ reviewId });
  const getUserVoteQuery = api.reviewVotes.getByUser.useQuery({ reviewId });
  const { mutate: likeOrUnlike } = api.reviewVotes.voteOrUnvote.useMutation({
    onMutate: async ({ reviewId, weight }) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await utils.reviewVotes.count.cancel();
      await utils.reviewVotes.getByUser.cancel();

      // Snapshot the previous value
      const previousCount = utils.reviewVotes.count.getData({ reviewId });
      const previousUserVote = utils.reviewVotes.getByUser.getData({
        reviewId,
      });

      // Optimistically update to the new value
      utils.reviewVotes.count.setData(
        { reviewId },
        (oldQueryData: number | undefined) => {
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
        },
      );
      utils.reviewVotes.getByUser.setData({ reviewId }, (oldQueryData) => {
        if (!oldQueryData) return null;
        return {
          ...oldQueryData,
          weight,
        };
      });

      // Return a context object with the snapshotted value
      return { previousCount, previousUserVote };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value if mutation fails
      utils.reviewVotes.count.setData({ reviewId }, context?.previousCount);
      utils.reviewVotes.getByUser.setData(
        { reviewId },
        context?.previousUserVote,
      );
    },
    onSuccess: (_, { weight }) => {
      if (ecfg.enableReviewEventsTracking) {
        const eventType =
          weight > 0 ? ReviewEventType.UPVOTE : ReviewEventType.DOWNVOTE;

        track({ reviewId, eventType });
      }
    },
    onSettled: () => {
      void utils.reviewVotes.count.invalidate({ reviewId });
      void utils.reviewVotes.getByUser.invalidate({ reviewId });
    },
  });

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
        likeOrUnlike({
          reviewId,
          weight: upvoted ? 1 : downvoted ? -1 : 0,
        });
      }}
    />
  );
};
