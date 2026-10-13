"use client";

import { toast } from "sonner";
import { api } from "@/common/tools/trpc/react";
import type { RouterOutputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import {
  BID_STATUS_LABELS,
  type UserBidStatus,
} from "@/modules/timetable/functions/bid-status";

type BidList = RouterOutputs["userBids"]["listMine"];

/**
 * Row-level mutations for the bids table: notes, delete, status and
 * add-to-timetable. Add/edit saves run inside the unified BidDialog (upsert/
 * update with its own optimistic callbacks + invalidation), so they are not
 * part of this hook.
 */
export function useBidsTableMutations({
  bids,
  activeTimetableId,
  effectiveTermId,
}: {
  bids: BidList | undefined;
  activeTimetableId: string | null;
  effectiveTermId: string | null;
}) {
  const utils = api.useUtils();

  const invalidateBids = () => {
    void utils.userBids.listMine.invalidate();
    void utils.userBids.getByClassIds.invalidate();
  };

  const updateNotesMutation = api.userBids.update.useMutation({
    onSuccess: () => {
      toast.success("Notes saved");
      invalidateBids();
    },
    onError: (error) => toast.error(`Failed to save notes: ${error.message}`),
  });

  const removeMutation = api.userBids.remove.useMutation({
    onSuccess: () => {
      toast.success("Bid deleted");
      invalidateBids();
    },
    onError: (error) => {
      toast.error(`Failed to delete bid: ${error.message}`);
    },
  });

  const setStatusMutation = api.userBids.setStatus.useMutation({
    ...createOptimisticMutationCallbacks<
      { id: string; status: UserBidStatus },
      BidList | undefined
    >({
      cancel: () => utils.userBids.listMine.cancel(),
      getSnapshot: () => utils.userBids.listMine.getData(),
      // Optimistically mirror server demoteSiblingBids: chosen bid gets
      // `status`, siblings on same class go to PARTICIPATED. Any divergence
      // is reconciled by the invalidate on settle.
      applyOptimistic: ({ id, status }) => {
        utils.userBids.listMine.setData(undefined, (old) => {
          if (!old) return old;
          const target = old.find((b) => b.id === id);
          const classId = target?.classId;
          return old.map((b) => {
            if (b.id === id) return { ...b, status };
            if (classId && b.classId === classId)
              return { ...b, status: "PARTICIPATED" };
            return b;
          });
        });
      },
      restoreSnapshot: (prev) =>
        utils.userBids.listMine.setData(undefined, prev),
      // Single settle-time refresh of both bid queries; onSuccess only
      // handles the timetable-side invalidations.
      invalidate: async () => {
        await Promise.all([
          utils.userBids.listMine.invalidate(),
          utils.userBids.getByClassIds.invalidate(),
        ]);
      },
    }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "PLANNED"
          ? "Bid reverted to planned"
          : `Bid marked as ${BID_STATUS_LABELS[variables.status].toLowerCase()}`,
      );
      // The grid reflects a newly-secured class (and drops it when the bid
      // leaves SECURED), so refresh the active arrangement + plan list too.
      if (activeTimetableId) {
        void utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId,
        });
      }
      if (effectiveTermId) {
        void utils.timetable.listMine.invalidate({
          acadTermId: effectiveTermId,
        });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Add a row's class to the active timetable for the current term.
  const addSlotMutation = api.timetable.addSlot.useMutation({
    onSuccess: (data, variables) => {
      const bid = (bids ?? []).find((b) => b.classId === variables.classId);
      const label = bid ? `${bid.courseCode} ${bid.section}` : "Class";
      if (data.created) {
        toast.success(`Added ${label} to timetable`);
      } else {
        toast.info(`${label} is already in timetable`);
      }
      if (activeTimetableId) {
        void utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId,
        });
      }
    },
    onError: (error) => {
      toast.error(`Failed to add to timetable: ${error.message}`);
    },
  });

  const addToTimetable = (classId: string) => {
    if (!activeTimetableId) {
      toast.error("No active timetable for this term");
      return;
    }
    addSlotMutation.mutate({ timetableId: activeTimetableId, classId });
  };

  const isBusy =
    updateNotesMutation.isPending ||
    removeMutation.isPending ||
    setStatusMutation.isPending;

  return {
    updateNotesMutation,
    removeMutation,
    setStatusMutation,
    addSlotMutation,
    addToTimetable,
    isBusy,
  };
}
