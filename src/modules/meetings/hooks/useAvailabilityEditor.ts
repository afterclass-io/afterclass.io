"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { api } from "@/common/tools/trpc/react";
import { computeFreeSlots } from "@/modules/meetings/hooks/useActiveTimetableOverlay";

type EditedSlots = { available: number[]; ifNeeded: number[] };

const NO_SLOTS: number[] = [];

export type UseAvailabilityEditorOptions = {
  slug: string;
  totalSlots: number;
  /** Slots already saved for the signed-in user. */
  savedAvailable: number[] | undefined;
  savedIfNeeded: number[] | undefined;
  isSignedIn: boolean;
  /** Called once the edits are saved. */
  onSaved?: () => void;
};

/** Unsaved availability edits for the viewer, with save, clear and autofill. */
export function useAvailabilityEditor({
  slug,
  totalSlots,
  savedAvailable,
  savedIfNeeded,
  isSignedIn,
  onSaved,
}: UseAvailabilityEditorOptions) {
  const utils = api.useUtils();
  const [edited, setEdited] = useState<EditedSlots | null>(null);

  const saveMutation = api.meetings.submitAvailability.useMutation({
    onSuccess: async () => {
      toast.success("Availability saved");
      setEdited(null);
      onSaved?.();
      await utils.meetings.getPollBySlug.invalidate({ slug });
      await utils.meetings.listMyMeetings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save availability");
    },
  });

  const availableSlots = edited ? edited.available : (savedAvailable ?? NO_SLOTS);
  const ifNeededSlots = edited ? edited.ifNeeded : (savedIfNeeded ?? NO_SLOTS);

  const setPainted = useCallback(
    ({
      availableSlots: available,
      ifNeededSlots: ifNeeded,
    }: {
      availableSlots: number[];
      ifNeededSlots: number[];
    }) => setEdited({ available, ifNeeded }),
    [],
  );

  const save = () => {
    if (!isSignedIn) {
      toast.error("Please sign in to save your availability");
      return;
    }
    saveMutation.mutate({ slug, availableSlots, ifNeededSlots });
  };

  const clear = () => setEdited({ available: [], ifNeeded: [] });

  /** Drops unsaved edits and falls back to what is saved. */
  const discard = () => setEdited(null);

  /** Marks every slot not blocked by the given calendar as available. */
  const autofillAround = (blockedSlots: Set<number>) => {
    setEdited({
      available: computeFreeSlots(totalSlots, blockedSlots),
      ifNeeded: [],
    });
  };

  return {
    availableSlots,
    ifNeededSlots,
    hasUnsavedChanges: edited !== null,
    isSaving: saveMutation.isPending,
    setPainted,
    save,
    clear,
    discard,
    autofillAround,
  };
}
