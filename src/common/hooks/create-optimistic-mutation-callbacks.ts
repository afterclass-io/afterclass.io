/**
 * Generic React-Query mutation callbacks for the repo's optimistic-update
 * pattern: cancel in-flight queries → snapshot the cache → apply the
 * optimistic write → restore the snapshot on error → invalidate on settle.
 * Previously copy-pasted in reviews/useOptimisticReaction,
 * roadmaps/useOptimisticReaction, RoadmapVoteGroup, VariantSwitcher and
 * SlotBidPanel — new mutations configure this helper instead of duplicating.
 */
export function createOptimisticMutationCallbacks<TVars, TSnapshot>({
  cancel,
  getSnapshot,
  applyOptimistic,
  restoreSnapshot,
  invalidate,
  onError,
}: {
  cancel: () => Promise<unknown>;
  getSnapshot: () => TSnapshot | undefined;
  applyOptimistic: (vars: TVars) => void;
  restoreSnapshot: (snapshot: TSnapshot | undefined) => void;
  invalidate: () => Promise<unknown>;
  onError?: (message: string) => void;
}) {
  return {
    onMutate: async (vars: TVars) => {
      await cancel();
      const prev = getSnapshot();
      applyOptimistic(vars);
      return { prev };
    },
    onError: (
      error: { message?: string },
      _vars: TVars,
      context: { prev?: TSnapshot } | undefined,
    ) => {
      if (context?.prev !== undefined) {
        restoreSnapshot(context.prev);
      }
      onError?.(error.message ?? "Something went wrong");
    },
    onSettled: () => {
      void invalidate();
    },
  };
}
