"use client";
import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";

import { api, type RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
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
    { enabled: true },
  );
  const getUserVoteQuery = api.roadmapVotes.getByUser.useQuery(
    { roadmapId },
    { enabled: !!session },
  );

  const mutation = api.roadmapVotes.voteOrUnvote.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["roadmapVotes"]["voteOrUnvote"],
      unknown
    >({
      cancel: async () => {
        await utils.roadmapVotes.count.cancel({ roadmapId });
        await utils.roadmapVotes.getByUser.cancel({ roadmapId });
      },
      getSnapshot: () => ({
        previousCount: utils.roadmapVotes.count.getData({ roadmapId }),
        previousUserVote: utils.roadmapVotes.getByUser.getData({ roadmapId }),
      }),
      // Pattern A: caller already applied for instant feedback.
      applyOptimistic: () => {
        /* Pattern A: caller (mutateWithDebounce) already applied */
      },
      restoreSnapshot: (prev) => {
        const snapshot = prev as
          | {
              previousCount?: number;
              previousUserVote?: { weight: number } | null;
            }
          | undefined;
        if (snapshot) {
          utils.roadmapVotes.count.setData({ roadmapId }, snapshot.previousCount);
          utils.roadmapVotes.getByUser.setData(
            { roadmapId },
            snapshot.previousUserVote as never,
          );
        }
      },
      invalidate: async () => {
        await utils.roadmapVotes.count.invalidate({ roadmapId });
        await utils.roadmapVotes.getByUser.invalidate({ roadmapId });
        await utils.roadmaps.getById.invalidate({ id: roadmapId });
      },
    }),
  });
  const voteOrUnvote = mutation.mutate;

  const applyOptimisticUpdate = useCallback(
    (variables: Parameters<typeof voteOrUnvote>[0]) => {
      const { roadmapId, weight } = variables;

      // Snapshot the previous value
      const previousUserVote = utils.roadmapVotes.getByUser.getData({
        roadmapId,
      });

      // Optimistically update vote count.
      // Count only tracks upvotes (weight: 1) — server-side semantics
      // changed in Task 2 from sum-based to count-only-upvotes.
      // The count changes only when an upvote is added or removed:
      //   gainUpvote: new weight is 1 but prev wasn't 1 → +1
      //   loseUpvote: prev weight was 1 but new weight isn't 1 → −1
      //   otherwise: no change (downvotes don't affect the count at all)
      utils.roadmapVotes.count.setData(
        { roadmapId },
        (oldQueryData: number | undefined) => {
          const prevVoteCount = oldQueryData ?? 0;
          const prevWeight = previousUserVote?.weight ?? 0;

          const gainUpvote = weight === 1 && prevWeight !== 1 ? 1 : 0;
          const loseUpvote = prevWeight === 1 && weight !== 1 ? -1 : 0;
          return prevVoteCount + gainUpvote + loseUpvote;
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

  const debouncedVoteOrUnvote = useMemo(
    () =>
      debounce((variables: Parameters<typeof voteOrUnvote>[0]) => {
        voteOrUnvote(variables);
      }, 300),
    [voteOrUnvote],
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
