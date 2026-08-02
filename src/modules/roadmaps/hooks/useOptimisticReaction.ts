import { api } from "@/common/tools/trpc/react";
import type { ReviewReactionType } from "@prisma/client";
import { debounce } from "lodash";
import { useCallback, useMemo } from "react";

export function useOptimisticReaction() {
  const utils = api.useUtils();

  const mutation = api.roadmapReactions.upsert.useMutation({
    onMutate: async ({ roadmapId }) => {
      // Snapshot the previous value
      const previousReactions = utils.roadmapReactions.getByRoadmapId.getData({
        roadmapId,
      });
      return { previousReactions };
    },
    onError: (_err, { roadmapId }, context) => {
      // Rollback to the previous value if mutation fails
      utils.roadmapReactions.getByRoadmapId.setData(
        { roadmapId },
        context?.previousReactions,
      );
    },
    onSettled: (_data, _err, { roadmapId }) => {
      // Refetch to sync with server state after mutation completes
      void utils.roadmapReactions.getByRoadmapId.invalidate({ roadmapId });
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
      const { roadmapId, reaction } = variables;

      utils.roadmapReactions.getByRoadmapId.setData(
        { roadmapId },
        (oldQueryData) => {
          const counts = oldQueryData?.counts ?? [];
          const prevViewer = oldQueryData?.viewerReaction ?? null;

          const decrement = (
            list: { reaction: ReviewReactionType; count: number }[],
            r: ReviewReactionType | null,
          ) =>
            list
              .map((c) =>
                c.reaction === r ? { ...c, count: Math.max(0, c.count - 1) } : c,
              )
              .filter((c) => c.count > 0);

          // when user undoes their reaction
          if (!reaction) {
            return {
              counts: decrement(counts, prevViewer),
              viewerReaction: null,
            };
          }

          // when user reacts (or switches to a new reaction)
          const afterRemove = prevViewer ? decrement(counts, prevViewer) : counts;
          const existing = afterRemove.find((c) => c.reaction === reaction);
          const nextCounts = existing
            ? afterRemove.map((c) =>
                c.reaction === reaction ? { ...c, count: c.count + 1 } : c,
              )
            : [...afterRemove, { reaction, count: 1 }];

          return { counts: nextCounts, viewerReaction: reaction };
        },
      );
    },
    [utils.roadmapReactions.getByRoadmapId],
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
