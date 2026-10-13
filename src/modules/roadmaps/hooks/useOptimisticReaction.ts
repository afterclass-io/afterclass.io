import { api, type RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { useCallback, useRef } from "react";

import { useDebouncedOptimisticMutate } from "@/common/hooks/use-debounced-optimistic-mutate";
import { updateReactionCounts } from "@/common/functions/reactions";

export function useOptimisticReaction() {
  const utils = api.useUtils();
  const lastInputRef = useRef<{ roadmapId: string } | null>(null);

  const mutation = api.roadmapReactions.upsert.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["roadmapReactions"]["upsert"],
      unknown
    >(
      // eslint-disable-next-line react-hooks/refs -- callbacks run in the mutation lifecycle (cancel/snapshot/restore), never during render; the ref carries the debounced input
      {
        cancel: async () => {
          if (lastInputRef.current) {
            await utils.roadmapReactions.getByRoadmapId.cancel(
              lastInputRef.current,
            );
          }
        },
        getSnapshot: () =>
          lastInputRef.current
            ? utils.roadmapReactions.getByRoadmapId.getData(
                lastInputRef.current,
              )
            : undefined,
        // Pattern A: the caller (mutateWithDebounce) already applied the optimistic
        // update for instant feedback — re-applying here would double-increment.
        applyOptimistic: () => {
          /* Pattern A: caller (mutateWithDebounce) already applied */
        },
        restoreSnapshot: (prev) => {
          if (lastInputRef.current) {
            utils.roadmapReactions.getByRoadmapId.setData(
              lastInputRef.current,
              prev as never,
            );
          }
        },
        invalidate: async () => {
          if (lastInputRef.current) {
            await utils.roadmapReactions.getByRoadmapId.invalidate(
              lastInputRef.current,
            );
          }
        },
      },
    ),
  });
  const mutate = mutation.mutate;

  const applyOptimisticUpdate = useCallback(
    (variables: Parameters<typeof mutate>[0]) => {
      const { roadmapId, reaction } = variables;
      lastInputRef.current = { roadmapId };

      utils.roadmapReactions.getByRoadmapId.setData(
        { roadmapId },
        (oldQueryData) => {
          return {
            counts: updateReactionCounts(
              oldQueryData?.counts ?? [],
              oldQueryData?.viewerReaction,
              reaction,
            ),
            viewerReaction: reaction ?? null,
          };
        },
      );
    },
    [utils.roadmapReactions.getByRoadmapId],
  );

  const mutateWithDebounce = useDebouncedOptimisticMutate(
    mutate,
    applyOptimisticUpdate,
  );

  return {
    ...mutation,
    mutate: mutateWithDebounce,
  };
}
