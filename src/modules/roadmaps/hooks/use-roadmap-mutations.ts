"use client";

import { toast } from "sonner";
import { api } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { createSaveEntriesCallbacks } from "@/modules/roadmaps/functions/save-callbacks";

/**
 * The editor's roadmap mutations: create, rename, delete, save entries,
 * set active, matriculation year, progress sync and faculty. `setMutating`
 * drives the roadmap list's busy state for create, rename and delete.
 */
export function useRoadmapMutations({
  selectedId,
  setSelectedId,
  setMutating,
}: {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setMutating: (mutating: boolean) => void;
}) {
  const utils = api.useUtils();

  const createMutation = api.roadmaps.create.useMutation({
    onSuccess: async (created) => {
      await utils.roadmaps.listMine.invalidate();
      setSelectedId(created.id);
      setMutating(false);
    },
    onError: (error) => {
      toast.error(
        error.data?.code === "UNAUTHORIZED"
          ? "You must be logged in to create a roadmap."
          : `Failed to create roadmap: ${error.message}`,
      );
      setMutating(false);
    },
  });

  const renameMutation = api.roadmaps.rename.useMutation({
    onSuccess: async () => {
      await utils.roadmaps.listMine.invalidate();
      setMutating(false);
    },
    onError: () => {
      toast.error("Failed to rename roadmap");
      setMutating(false);
    },
  });

  const removeMutation = api.roadmaps.remove.useMutation({
    onSuccess: async () => {
      await utils.roadmaps.listMine.invalidate();
      setMutating(false);
      // If the deleted roadmap was selected, pick another
      if (selectedId === removeMutation.variables?.roadmapId) {
        setSelectedId(null);
      }
    },
    onError: () => {
      toast.error("Failed to delete roadmap");
      setMutating(false);
    },
  });

  const saveEntriesMutation = api.roadmaps.saveEntries.useMutation({
    ...createSaveEntriesCallbacks({
      utils,
      roadmapId: selectedId!,
      toast: (m) => toast.error(m),
    }),
  });

  const setActiveMutation = api.roadmaps.setActive.useMutation({
    onSuccess: async () => {
      await utils.roadmaps.listMine.invalidate();
      toast.success("Roadmap marked as active");
    },
    onError: () => {
      toast.error("Failed to mark roadmap as active");
    },
  });

  const setMatricTermMutation = api.roadmaps.setMatricTerm.useMutation({
    ...createOptimisticMutationCallbacks<
      { roadmapId: string; matricTermId: string | null },
      NonNullable<ReturnType<typeof utils.roadmaps.listMine.getData>>
    >({
      // listMine is an inputless query — thread no input through every utils
      // call so cancel/snapshot/setData/invalidate hit the same cache key.
      cancel: () => utils.roadmaps.listMine.cancel(),
      getSnapshot: () => utils.roadmaps.listMine.getData(),
      applyOptimistic: ({ roadmapId, matricTermId }) =>
        utils.roadmaps.listMine.setData(undefined, (old) =>
          old?.map((r) => (r.id === roadmapId ? { ...r, matricTermId } : r)),
        ),
      restoreSnapshot: (prev) =>
        utils.roadmaps.listMine.setData(undefined, prev),
      invalidate: async () => {
        await utils.roadmaps.listMine.invalidate();
        await utils.roadmaps.getMine.invalidate();
      },
      onError: (message) =>
        toast.error(`Failed to save matriculation year: ${message}`),
    }),
    onSuccess: () =>
      toast.success("Matriculation year saved", {
        description:
          "Existing modules keep their placement. Use Sync progress or re-add courses to reflect the new year.",
      }),
  });

  const syncProgressMutation = api.roadmaps.syncProgress.useMutation({
    onSuccess: async (result) => {
      if (result.synced > 0) {
        toast.success(
          `${result.synced} course${result.synced === 1 ? "" : "s"} synced`,
        );
        await utils.roadmaps.getMine.invalidate({ roadmapId: selectedId! });
        await utils.roadmaps.listMine.invalidate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to sync progress");
    },
  });

  // Per-roadmap faculty — no global Users.facultyId. The Select always
  // reflects the selected roadmap's facultyId, so switching roadmaps no
  // longer leaks one roadmap's faculty into another.
  const setFacultyMutation = api.roadmaps.setFaculty.useMutation({
    ...createOptimisticMutationCallbacks<
      { roadmapId: string; facultyId: number | null },
      NonNullable<ReturnType<typeof utils.roadmaps.listMine.getData>>
    >({
      cancel: () => utils.roadmaps.listMine.cancel(),
      getSnapshot: () => utils.roadmaps.listMine.getData(),
      applyOptimistic: ({ roadmapId, facultyId }) =>
        utils.roadmaps.listMine.setData(undefined, (old) =>
          old?.map((r) => (r.id === roadmapId ? { ...r, facultyId } : r)),
        ),
      restoreSnapshot: (prev) =>
        utils.roadmaps.listMine.setData(undefined, prev),
      invalidate: async () => {
        await utils.roadmaps.listMine.invalidate();
        await utils.roadmaps.getMine.invalidate();
      },
      onError: (message) => toast.error(`Failed to save faculty: ${message}`),
    }),
    onSuccess: () => toast.success("Faculty saved for this roadmap"),
  });

  return {
    createMutation,
    renameMutation,
    removeMutation,
    saveEntriesMutation,
    setActiveMutation,
    setMatricTermMutation,
    syncProgressMutation,
    setFacultyMutation,
  };
}
