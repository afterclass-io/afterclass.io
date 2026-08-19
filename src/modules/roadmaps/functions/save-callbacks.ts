import type { api } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { isConflictError } from "./save-with-retry";

type SaveEntriesInput = {
  roadmapId: string;
  updatedAt?: string;
  entries: {
    courseId: string;
    yearNumber: number;
    term: "T1" | "T2" | "T3A" | "T3B";
    sortOrder: number;
  }[];
};

type Utils = ReturnType<typeof api.useUtils>;

export function createSaveEntriesCallbacks({
  utils,
  roadmapId,
  toast,
}: {
  utils: Utils;
  roadmapId: string;
  toast: (msg: string) => void;
}) {
  const key = { roadmapId };
  const base = createOptimisticMutationCallbacks<SaveEntriesInput, unknown>({
    cancel: () => utils.roadmaps.getMine.cancel(key),
    getSnapshot: () => utils.roadmaps.getMine.getData(key),
    applyOptimistic: () => {
      // handleEntriesChange already populated the cache with full course
      // objects; overwriting with the subset input (no `course`) breaks
      // `e.course.code` and throws "Cannot read properties of undefined
      // (reading 'code')".
    },
    restoreSnapshot: (prev) => {
      utils.roadmaps.getMine.setData(
        key,
        prev as Parameters<(typeof utils.roadmaps.getMine)["setData"]>[1],
      );
    },
    invalidate: () =>
      Promise.all([
        utils.roadmaps.getMine.invalidate(key),
        utils.roadmaps.listMine.invalidate(),
      ]),
    onError: (message) => toast(`Failed to save roadmap: ${message}`),
  });
  return {
    ...base,
    // Keep the client's version token in sync with the server-bumped
    // updatedAt so the next save doesn't trip the CONFLICT check while the
    // invalidation refetch is still in flight.
    onSuccess: (result: { updatedAt?: Date | string } | undefined) => {
      if (!result?.updatedAt) return;
      const updatedAt = new Date(result.updatedAt);
      utils.roadmaps.getMine.setData(key, (old) =>
        old ? { ...old, roadmap: { ...old.roadmap, updatedAt } } : old,
      );
    },
    // CONFLICTs are absorbed and retried by saveEntriesWithConflictRetry —
    // don't restore the snapshot or toast for the attempt it will retry;
    // the caller surfaces a CONFLICT only if the retry also fails.
    onError: (
      error: { message?: string; data?: { code?: string } | null },
      vars: SaveEntriesInput,
      context?: { prev?: unknown },
    ) => {
      if (isConflictError(error)) return;
      base.onError(error, vars, context);
    },
  };
}
