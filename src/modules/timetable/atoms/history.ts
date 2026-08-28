import { atom } from "jotai";

export type TimetableAction =
  | { type: "addSlot"; timetableId: string; classId: string }
  | { type: "removeSlot"; timetableId: string; classId: string }
  | {
      type: "setSlotSection";
      timetableId: string;
      courseId: string;
      fromClassId: string;
      toClassId: string;
    }
  | { type: "editNotes"; bidId: string; fromNotes: string | null; toNotes: string | null };

export const HISTORY_LIMIT = 50;

export const undoStackAtom = atom<TimetableAction[]>([]);
export const redoStackAtom = atom<TimetableAction[]>([]);
export const canUndoAtom = atom((get) => get(undoStackAtom).length > 0);
export const canRedoAtom = atom((get) => get(redoStackAtom).length > 0);

/** Record a performed action; a fresh action clears the redo stack. */
export const pushHistoryAtom = atom(null, (get, set, action: TimetableAction) => {
  set(undoStackAtom, [...get(undoStackAtom), action].slice(-HISTORY_LIMIT));
  set(redoStackAtom, []);
});

/** The action that undoes `action` (section swaps store classIds because
 *  `timetable.setSlotSection` takes `{ timetableId, courseId, classId }`). */
export function invertAction(action: TimetableAction): TimetableAction {
  switch (action.type) {
    case "addSlot":
      return { type: "removeSlot", timetableId: action.timetableId, classId: action.classId };
    case "removeSlot":
      return { type: "addSlot", timetableId: action.timetableId, classId: action.classId };
    case "setSlotSection":
      return {
        type: "setSlotSection",
        timetableId: action.timetableId,
        courseId: action.courseId,
        fromClassId: action.toClassId,
        toClassId: action.fromClassId,
      };
    case "editNotes":
      return { type: "editNotes", bidId: action.bidId, fromNotes: action.toNotes, toNotes: action.fromNotes };
    default: {
      const exhaustiveCheck: never = action;
      throw new Error(
        `invertAction: unhandled action ${JSON.stringify(exhaustiveCheck)}`,
      );
    }
  }
}
