import { describe, expect, it, vi } from "vitest";
import { createSaveEntriesCallbacks } from "./save-callbacks";

const roadmapId = "r1";
const prev = {
  roadmap: { id: "r1", name: "Test", description: null },
  entries: [
    { id: "old", courseId: "c1", yearNumber: 1, term: "T1", sortOrder: 0 },
  ],
};

function makeUtils() {
  const getData = vi.fn().mockReturnValue(prev);
  const setData = vi.fn();
  const getMineInvalidate = vi.fn().mockResolvedValue(undefined);
  const cancel = vi.fn().mockResolvedValue(undefined);
  const listMineInvalidate = vi.fn().mockResolvedValue(undefined);
  return {
    getData,
    setData,
    getMineInvalidate,
    cancel,
    listMineInvalidate,
    utils: {
      roadmaps: {
        getMine: { getData, setData, invalidate: getMineInvalidate, cancel },
        listMine: { invalidate: listMineInvalidate },
      },
    },
  };
}

describe("createSaveEntriesCallbacks", () => {
  it("does not clobber the cache on mutate — handleEntriesChange already set full course objects", async () => {
    const { utils, cancel, setData } = makeUtils();
    const callbacks = createSaveEntriesCallbacks({
      utils: utils as never,
      roadmapId,
      toast: vi.fn(),
    });
    const newEntries = [
      { courseId: "c2", yearNumber: 1, term: "T1" as const, sortOrder: 0 },
    ];
    await callbacks.onMutate({ roadmapId, entries: newEntries });
    expect(cancel).toHaveBeenCalled();
    // handleEntriesChange already populated the cache with full `course`
    // objects; the mutation callback must not overwrite them with the
    // subset input (which has no `course` and would make `e.course.code`
    // throw "Cannot read properties of undefined (reading 'code')").
    expect(setData).not.toHaveBeenCalled();
  });

  it("restores previous data on error", async () => {
    const { utils, setData } = makeUtils();
    const callbacks = createSaveEntriesCallbacks({
      utils: utils as never,
      roadmapId,
      toast: vi.fn(),
    });
    const context = await callbacks.onMutate({
      roadmapId,
      entries: [{ courseId: "c2", yearNumber: 1, term: "T1", sortOrder: 0 }],
    });
    callbacks.onError(new Error("boom"), { roadmapId, entries: [] }, context);
    // setData should be called again to restore the snapshot
    expect(setData).toHaveBeenLastCalledWith({ roadmapId }, prev);
  });

  it("invalidates both getMine and listMine on settle", async () => {
    const { utils, getMineInvalidate, listMineInvalidate } = makeUtils();
    const callbacks = createSaveEntriesCallbacks({
      utils: utils as never,
      roadmapId,
      toast: vi.fn(),
    });
    // Trigger onSettled which calls the composed invalidate
    callbacks.onSettled();
    expect(getMineInvalidate).toHaveBeenCalledWith({ roadmapId });
    expect(listMineInvalidate).toHaveBeenCalled();
  });

  it("neither restores the snapshot nor toasts on CONFLICT (the retry helper owns those)", async () => {
    const { utils, setData } = makeUtils();
    const toast = vi.fn();
    const callbacks = createSaveEntriesCallbacks({
      utils: utils as never,
      roadmapId,
      toast,
    });
    const context = await callbacks.onMutate({
      roadmapId,
      entries: [{ courseId: "c2", yearNumber: 1, term: "T1", sortOrder: 0 }],
    });
    setData.mockClear();
    callbacks.onError(
      {
        message: "This roadmap was updated elsewhere. Refresh and try again.",
        data: { code: "CONFLICT" },
      },
      { roadmapId, entries: [] },
      context,
    );
    expect(setData).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("writes the server-bumped updatedAt into the getMine cache on success", () => {
    const { utils, setData } = makeUtils();
    const callbacks = createSaveEntriesCallbacks({
      utils: utils as never,
      roadmapId,
      toast: vi.fn(),
    });
    const updatedAt = new Date("2026-08-02T00:00:00.000Z");
    callbacks.onSuccess({ updatedAt });
    expect(setData).toHaveBeenCalledWith({ roadmapId }, expect.any(Function));
    const updater = setData.mock.calls[0]![1] as (
      old: typeof prev,
    ) => typeof prev;
    const result = updater(prev);
    expect(result.roadmap).toEqual({ ...prev.roadmap, updatedAt });
    expect(result.entries).toBe(prev.entries);
  });
});
