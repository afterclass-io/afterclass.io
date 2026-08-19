import { api, type RouterInputs } from "@/common/tools/trpc/react";
import type { ReviewReactionType } from "@prisma/client";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { debounce } from "lodash";
import { useCallback, useMemo, useRef } from "react";

export function useOptimisticReaction() {
  const utils = api.useUtils();
  const lastInputRef = useRef<{ roadmapId: string } | null>(null);

  const mutation = api.roadmapReactions.upsert.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["roadmapReactions"]["upsert"],
      unknown
    >({
      cancel: async () => {
        if (lastInputRef.current) {
          await utils.roadmapReactions.getByRoadmapId.cancel(lastInputRef.current);
        }
      },
      getSnapshot: () =>
        lastInputRef.current
          ? utils.roadmapReactions.getByRoadmapId.getData(lastInputRef.current)
          : undefined,
      // Pattern A: the caller (mutateWithDebounce) already applied the optimistic
      // update for instant feedback — re-applying here would double-increment.
      applyOptimistic: () => {
        /* Pattern A: caller (mutateWithDebounce) already applied */
      },
      restoreSnapshot: (prev) => {
        if (lastInputRef.current) {
          utils.roadmapReactions.getByRoadmapId.setData(lastInputRef.current, prev as never);
        }
      },
      invalidate: async () => {
        if (lastInputRef.current) {
          await utils.roadmapReactions.getByRoadmapId.invalidate(lastInputRef.current);
        }
      },
    }),
  });
  const mutate = mutation.mutate;

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

  const debouncedMutate = useMemo(
    () =>
      debounce((variables: Parameters<typeof mutate>[0]) => {
        mutate(variables);
      }, 300),
    [mutate],
  );

  const mutateWithDebounce = useCallback(
    (variables: Parameters<typeof mutate>[0]) => {
      lastInputRef.current = { roadmapId: variables.roadmapId };
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
