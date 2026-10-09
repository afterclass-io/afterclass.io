"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { api, type RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";

/**
 * Save, update, remove-slot, status and notes mutations for the unified bid
 * dialog. Each one refreshes the bid queries for the selected class.
 */
export function useBidDialogMutations({
  acadTermId,
  selectedClassId,
  activeTimetableId,
  courseCodeLabel,
  sectionLabel,
  onClose,
}: {
  acadTermId: string;
  selectedClassId: string | null;
  activeTimetableId: string | null;
  courseCodeLabel: string;
  sectionLabel: string;
  onClose: () => void;
}) {
  const utils = api.useUtils();

  const invalidateBidQueries = useCallback(async () => {
    await utils.userBids.listMine.invalidate();
    await utils.userBids.getByClassIds.invalidate();
    if (activeTimetableId) {
      await utils.timetable.getArrangement.invalidate({
        timetableId: activeTimetableId,
      });
    }
  }, [utils, activeTimetableId]);

  const upsertMutation = api.userBids.upsert.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["userBids"]["upsert"],
      unknown
    >({
      cancel: () =>
        utils.userBids.getByClassIds.cancel({
          classIds: [selectedClassId ?? ""],
        }),
      getSnapshot: () =>
        utils.userBids.getByClassIds.getData({
          classIds: [selectedClassId ?? ""],
        }),
      // Pattern B: the caller does NOT apply optimistically — new rows appear
      // via the invalidate refetch.
      applyOptimistic: () => undefined,
      restoreSnapshot: (prev) => {
        utils.userBids.getByClassIds.setData(
          { classIds: [selectedClassId ?? ""] },
          prev as never,
        );
      },
      invalidate: invalidateBidQueries,
      onError: (message) => toast.error(`Failed to save bid: ${message}`),
    }),
    onSuccess: () => {
      toast.success(`Bid saved for ${courseCodeLabel} ${sectionLabel}`);
      onClose();
    },
  });

  const updateMutation = api.userBids.update.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["userBids"]["update"],
      unknown
    >({
      cancel: () =>
        utils.userBids.getByClassIds.cancel({
          classIds: [selectedClassId ?? ""],
        }),
      getSnapshot: () =>
        utils.userBids.getByClassIds.getData({
          classIds: [selectedClassId ?? ""],
        }),
      // Pattern B: the caller does NOT apply optimistically — updated rows
      // appear via the invalidate refetch.
      applyOptimistic: () => undefined,
      restoreSnapshot: (prev) => {
        utils.userBids.getByClassIds.setData(
          { classIds: [selectedClassId ?? ""] },
          prev as never,
        );
      },
      invalidate: invalidateBidQueries,
      onError: (message) => toast.error(`Failed to update bid: ${message}`),
    }),
    onSuccess: () => {
      toast.success(`Bid updated for ${courseCodeLabel} ${sectionLabel}`);
      onClose();
    },
  });

  // ---- Class-mode only: remove slot + existing-bids status/notes ----
  const removeSlotMutation = api.timetable.removeSlot.useMutation({
    onSuccess: () => {
      toast.success(
        `Removed ${courseCodeLabel} ${sectionLabel} from timetable`,
      );
      if (activeTimetableId) {
        void utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId,
        });
      }
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to remove class: ${error.message}`);
    },
  });

  // Filter classes for invalidation: only siblings sharing classId can
  // change via demoteSiblingBids (same-window siblings become PARTICIPATED).
  const setStatusMutation = api.userBids.setStatus.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["userBids"]["setStatus"],
      unknown
    >({
      cancel: () =>
        utils.userBids.getByClassIds.cancel({
          classIds: [selectedClassId ?? ""],
        }),
      getSnapshot: () =>
        utils.userBids.getByClassIds.getData({
          classIds: [selectedClassId ?? ""],
        }),
      // Optimistically mirror the server's demoteSiblingBids rule:
      // set the chosen bid to `status`, and any sibling on the same class
      // to PARTICIPATED. The invalidation below reconciles races.
      applyOptimistic: ({ id, status }) => {
        utils.userBids.getByClassIds.setData(
          { classIds: [selectedClassId ?? ""] },
          (old) =>
            old?.map((bid) => {
              if (bid.id === id) return { ...bid, status };
              if (bid.classId === selectedClassId)
                return { ...bid, status: "PARTICIPATED" };
              return bid;
            }),
        );
      },
      restoreSnapshot: (prev) => {
        utils.userBids.getByClassIds.setData(
          { classIds: [selectedClassId ?? ""] },
          prev as never,
        );
      },
      invalidate: async () => {
        await utils.userBids.getByClassIds.invalidate();
        await utils.userBids.listMine.invalidate();
        // The grid reflects a newly-secured class (and drops it when the bid
        // leaves SECURED), so refresh the active arrangement + plan list too.
        if (activeTimetableId) {
          await utils.timetable.getArrangement.invalidate({
            timetableId: activeTimetableId,
          });
        }
        await utils.timetable.listMine.invalidate({ acadTermId });
      },
      onError: () => toast.error("Failed to update bid status"),
    }),
  });

  const updateNotesMutation = api.userBids.update.useMutation({
    onSuccess: () => {
      toast.success("Notes saved");
      void utils.userBids.getByClassIds.invalidate();
      void utils.userBids.listMine.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to save notes: ${error.message}`);
    },
  });

  return {
    upsertMutation,
    updateMutation,
    removeSlotMutation,
    setStatusMutation,
    updateNotesMutation,
  };
}
