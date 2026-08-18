"use client";

import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { toast } from "sonner";
import { api } from "@/common/tools/trpc/react";
import {
  invertAction,
  redoStackAtom,
  undoStackAtom,
  type TimetableAction,
} from "@/modules/timetable/atoms/history";
import {
  useAddSlotMutation,
  useRemoveSlotMutation,
  useSetSlotSectionMutation,
} from "@/modules/timetable/hooks/use-slot-mutations";

/**
 * Client-side undo/redo for timetable actions (add slot, remove slot,
 * swap section, edit notes). Undo pops the last action and executes its
 * inverse through the SAME shared optimistic mutations the page uses
 * (DRY — one config per mutation); redo re-executes the original action.
 *
 * Keyboard: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo — ignored
 * while typing in form fields. History resets on term/plan switch (the
 * page clears both stacks). Not persisted across reloads (YAGNI).
 */
export function useTimetableHistory() {
  const [undoStack, setUndoStack] = useAtom(undoStackAtom);
  const [redoStack, setRedoStack] = useAtom(redoStackAtom);
  // Shared hooks — same configs as page.tsx / SectionPicker.tsx (DRY).
  const removeSlot = useRemoveSlotMutation();
  const addSlot = useAddSlotMutation();
  const setSlotSection = useSetSlotSectionMutation();
  const utils = api.useUtils();
  // Notes edits are restored via `userBids.update` (same procedure the
  // notes editors call); invalidate so the editors re-key on the refetch.
  const updateBid = api.userBids.update.useMutation({
    onSuccess: () => {
      void utils.userBids.getByClassIds.invalidate();
      void utils.userBids.listMine.invalidate();
    },
    onError: (error) => toast.error(`Failed to save notes: ${error.message}`),
  });

  const execute = useCallback(
    (action: TimetableAction) => {
      switch (action.type) {
        case "addSlot":
          addSlot.mutate({ timetableId: action.timetableId, classId: action.classId });
          break;
        case "removeSlot":
          removeSlot.mutate({ timetableId: action.timetableId, classId: action.classId });
          break;
        case "setSlotSection":
          setSlotSection.mutate({
            timetableId: action.timetableId,
            courseId: action.courseId,
            classId: action.toClassId,
          });
          break;
        case "editNotes":
          updateBid.mutate({ id: action.bidId, notes: action.toNotes });
          break;
      }
    },
    [addSlot, removeSlot, setSlotSection, updateBid],
  );

  const undo = useCallback(() => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, action]);
    execute(invertAction(action));
  }, [undoStack, setUndoStack, setRedoStack, execute]);

  const redo = useCallback(() => {
    const action = redoStack[redoStack.length - 1];
    if (!action) return;
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, action]);
    execute(action);
  }, [redoStack, setRedoStack, setUndoStack, execute]);

  // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo. Ignore while
  // typing in form fields.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing || !(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.key.toLowerCase() === "z" && e.shiftKey) ||
        e.key.toLowerCase() === "y"
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return { undo, redo };
}
