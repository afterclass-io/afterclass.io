"use client";
import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";

import { api } from "@/common/tools/trpc/react";
import { VoteGroup } from "@/common/components/vote-group";

import { debounce } from "lodash";

export const RoadmapVoteGroup = ({
  roadmapId,
  initialViewerVoteWeight,
}: {
  roadmapId: string;
  /** Preloaded viewer vote weight (1 = upvoted) from the page-level getById. */
  initialViewerVoteWeight?: number;
}) => {
  const { data: session } = useSession();

  const utils = api.useUtils();
  const roadmapVotesCountQuery = api.roadmapVotes.count.useQuery(
    { roadmapId },
    { enabled: !!session },
  );
  const getUserVoteQuery = api.roadmapVotes.getByUser.useQuery(
    { roadmapId },
    { enabled: !!session },
  );

  const mutation = api.roadmapVotes.voteOrUnvote.useMutation({
    onMutate: async ({ roadmapId }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.roadmapVotes.count.cancel();
      await utils.roadmapVotes.getByUser.cancel();
      // Snapshot the previous value
      const previousCount = utils.roadmapVotes.count.getData({ roadmapId });
      const previousUserVote = utils.roadmapVotes.getByUser.getData({
        roadmapId,
      });
      // Return a context object with the snapshotted value
      return { previousCount, previousUserVote };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value if mutation fails
      utils.roadmapVotes.count.setData({ roadmapId }, context?.previousCount);
      utils.roadmapVotes.getByUser.setData(
        { roadmapId },
        context?.previousUserVote,
      );
    },
    onSettled: () => {
      void utils.roadmapVotes.count.invalidate({ roadmapId });
      void utils.roadmapVotes.getByUser.invalidate({ roadmapId });
    },
  });
  const voteOrUnvote = mutation.mutate;

  const debouncedVoteOrUnvote = useMemo(
    () =>
      debounce((variables: Parameters<typeof voteOrUnvote>[0]) => {
        voteOrUnvote(variables);
      }, 300),
    [voteOrUnvote],
  ); // 300 ms before voteOrUnvote is called

  const applyOptimisticUpdate = useCallback(
    (variables: Parameters<typeof voteOrUnvote>[0]) => {
      const { roadmapId, weight } = variables;

      // Snapshot the previous value
      const previousUserVote = utils.roadmapVotes.getByUser.getData({
        roadmapId,
      });

      // Optimistically update vote count
      utils.roadmapVotes.count.setData(
        { roadmapId },
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

      // Optimistically update user weight
      utils.roadmapVotes.getByUser.setData({ roadmapId }, (oldQueryData) => {
        if (!oldQueryData) return null;
        return {
          ...oldQueryData,
          weight,
        };
      });
    },
    [utils.roadmapVotes.count, utils.roadmapVotes.getByUser],
  );

  const mutateWithDebounce = useCallback(
    (variables: Parameters<typeof voteOrUnvote>[0]) => {
      applyOptimisticUpdate(variables); // immediate UI update
      debouncedVoteOrUnvote(variables); // debounced server mutation
    },
    [applyOptimisticUpdate, debouncedVoteOrUnvote],
  );

  const getUserVoteWeight = useCallback(() => {
    if (getUserVoteQuery.data) {
      return getUserVoteQuery.data.weight;
    }
    return initialViewerVoteWeight ?? 0;
  }, [getUserVoteQuery.data, initialViewerVoteWeight]);

  return (
    <VoteGroup
      upvotes={roadmapVotesCountQuery.data ?? 0}
      downvotes={0}
      upvoted={getUserVoteWeight() > 0}
      downvoted={getUserVoteWeight() < 0}
      onVoteChange={({ upvoted, downvoted }) => {
        if (!session) return;
        mutateWithDebounce({
          roadmapId,
          weight: upvoted ? 1 : downvoted ? -1 : 0,
        });
      }}
    />
  );
};
