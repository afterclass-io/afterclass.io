import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  HISTORY_LIMIT,
  invertAction,
  pushHistoryAtom,
  redoStackAtom,
  undoStackAtom,
} from "./history";

const add = { type: "addSlot", timetableId: "t1", classId: "c1" } as const;

describe("history atoms", () => {
  it("push appends to the undo stack and clears the redo stack", () => {
    const store = createStore();
    store.set(pushHistoryAtom, add);
    expect(store.get(undoStackAtom)).toEqual([add]);
    expect(store.get(redoStackAtom)).toEqual([]);
  });

  it("caps the undo stack at HISTORY_LIMIT", () => {
    const store = createStore();
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) store.set(pushHistoryAtom, add);
    expect(store.get(undoStackAtom)).toHaveLength(HISTORY_LIMIT);
  });
});

describe("invertAction", () => {
  it("inverts addSlot into removeSlot for the same class", () => {
    expect(invertAction(add)).toEqual({
      type: "removeSlot",
      timetableId: "t1",
      classId: "c1",
    });
  });

  it("inverts removeSlot into addSlot", () => {
    expect(invertAction({ type: "removeSlot", timetableId: "t1", classId: "c1" })).toEqual({
      type: "addSlot",
      timetableId: "t1",
      classId: "c1",
    });
  });

  it("inverts a section swap back to the previous section class", () => {
    expect(
      invertAction({
        type: "setSlotSection",
        timetableId: "t1",
        courseId: "course1",
        fromClassId: "c1",
        toClassId: "c2",
      }),
    ).toEqual({
      type: "setSlotSection",
      timetableId: "t1",
      courseId: "course1",
      fromClassId: "c2",
      toClassId: "c1",
    });
  });

  it("inverts a notes edit back to the previous notes", () => {
    expect(invertAction({ type: "editNotes", bidId: "b1", fromNotes: "old", toNotes: "new" })).toEqual({
      type: "editNotes",
      bidId: "b1",
      fromNotes: "new",
      toNotes: "old",
    });
  });
});
