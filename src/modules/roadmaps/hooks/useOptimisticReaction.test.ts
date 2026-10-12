// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ReactionCount } from "@/common/functions/reactions";
import { ReviewReactionType } from "@/generated/prisma/enums";

import { useOptimisticReaction } from "./useOptimisticReaction";

type Vars = { roadmapId: string; reaction?: ReviewReactionType };
type Input = { roadmapId: string };
type Data = {
  counts: ReactionCount[];
  viewerReaction: ReviewReactionType | null;
};
type Updater = (old: Data | undefined) => Data;
type Callbacks = {
  onMutate: (vars: Vars) => Promise<{ prev?: Data }>;
  onError: (
    error: { message?: string },
    vars: Vars,
    context?: { prev?: Data },
  ) => void;
  onSettled: () => void;
};

const mocks = vi.hoisted(() => {
  const getByRoadmapId = {
    cancel: vi.fn<(input: Input) => Promise<void>>(async () => undefined),
    getData: vi.fn<(input: Input) => Data | undefined>(),
    setData: vi.fn<(input: Input, value: Data | Updater) => void>(),
    invalidate: vi.fn<(input: Input) => Promise<void>>(async () => undefined),
  };
  return {
    getByRoadmapId,
    utils: { roadmapReactions: { getByRoadmapId } },
    upsertUseMutation:
      vi.fn<(options: Callbacks) => { mutate: (vars: Vars) => void }>(),
    upsertMutate: vi.fn<(vars: Vars) => void>(),
  };
});

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    useUtils: () => mocks.utils,
    roadmapReactions: { upsert: { useMutation: mocks.upsertUseMutation } },
  },
}));

const LIKE = ReviewReactionType.LIKE;
const SLAY = ReviewReactionType.SLAY;
const ROADMAP = "rm1";
const seeded: Data = {
  counts: [{ reaction: SLAY, count: 2 }],
  viewerReaction: SLAY,
};

const callbacks = (): Callbacks => {
  const call = mocks.upsertUseMutation.mock.lastCall;
  if (!call) throw new Error("useMutation was not called");
  return call[0];
};

const optimisticUpdaterAt = (index: number): Updater => {
  const value = mocks.getByRoadmapId.setData.mock.calls[index]?.[1];
  if (typeof value !== "function") {
    throw new Error("setData was not called with an updater");
  }
  return value;
};

const clearCalls = () => {
  const { cancel, getData, setData, invalidate } = mocks.getByRoadmapId;
  for (const fn of [cancel, getData, setData, invalidate]) fn.mockClear();
  mocks.upsertMutate.mockClear();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.getByRoadmapId.getData.mockReturnValue(undefined);
  mocks.upsertUseMutation.mockReturnValue({ mutate: mocks.upsertMutate });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("roadmap useOptimisticReaction (characterization)", () => {
  it("writes optimistically at mutate time, then sends the same variables after 300ms", () => {
    const { result } = renderHook(() => useOptimisticReaction());
    const vars = { roadmapId: ROADMAP, reaction: LIKE };

    act(() => result.current.mutate(vars));

    expect(mocks.getByRoadmapId.setData).toHaveBeenCalledTimes(1);
    expect(mocks.upsertMutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mocks.upsertMutate).toHaveBeenCalledTimes(1);
    expect(mocks.upsertMutate.mock.calls[0]?.[0]).toBe(vars);
  });

  it("runs cancel, then snapshot on mutate, then invalidate on settle, all with the same roadmapId", async () => {
    mocks.getByRoadmapId.getData.mockReturnValue(seeded);
    const { result } = renderHook(() => useOptimisticReaction());
    const cb = callbacks();
    const vars = { roadmapId: ROADMAP, reaction: LIKE };

    act(() => result.current.mutate(vars));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    clearCalls();

    const context = await cb.onMutate(vars);

    expect(mocks.getByRoadmapId.cancel).toHaveBeenCalledWith({
      roadmapId: ROADMAP,
    });
    expect(mocks.getByRoadmapId.getData).toHaveBeenCalledWith({
      roadmapId: ROADMAP,
    });
    const cancelOrder =
      mocks.getByRoadmapId.cancel.mock.invocationCallOrder[0] ?? Infinity;
    const snapshotOrder =
      mocks.getByRoadmapId.getData.mock.invocationCallOrder[0] ?? -1;
    expect(cancelOrder).toBeLessThan(snapshotOrder);
    // onMutate does not write the cache; the mutate call already did.
    expect(mocks.getByRoadmapId.setData).not.toHaveBeenCalled();
    expect(context).toEqual({ prev: seeded });

    cb.onSettled();

    expect(mocks.getByRoadmapId.invalidate).toHaveBeenCalledWith({
      roadmapId: ROADMAP,
    });
  });

  it("restores the snapshot with setData on error, using the last roadmapId", async () => {
    mocks.getByRoadmapId.getData.mockReturnValue(seeded);
    const { result } = renderHook(() => useOptimisticReaction());
    const cb = callbacks();
    const vars = { roadmapId: ROADMAP, reaction: LIKE };

    act(() => result.current.mutate(vars));
    const context = await cb.onMutate(vars);
    clearCalls();

    cb.onError({ message: "boom" }, vars, context);

    expect(mocks.getByRoadmapId.setData).toHaveBeenCalledTimes(1);
    expect(mocks.getByRoadmapId.setData).toHaveBeenCalledWith(
      { roadmapId: ROADMAP },
      seeded,
    );
  });

  it("makes no cache calls from cancel, restore or invalidate when no mutate ran first", async () => {
    renderHook(() => useOptimisticReaction());
    const cb = callbacks();
    const vars = { roadmapId: ROADMAP, reaction: LIKE };

    const context = await cb.onMutate(vars);
    cb.onError({ message: "boom" }, vars, { prev: seeded });
    cb.onSettled();

    expect(context.prev).toBeUndefined();
    expect(mocks.getByRoadmapId.cancel).not.toHaveBeenCalled();
    expect(mocks.getByRoadmapId.getData).not.toHaveBeenCalled();
    expect(mocks.getByRoadmapId.setData).not.toHaveBeenCalled();
    expect(mocks.getByRoadmapId.invalidate).not.toHaveBeenCalled();
  });

  it("moves the optimistic counts with updateReactionCounts when setData runs", () => {
    const { result } = renderHook(() => useOptimisticReaction());

    act(() => result.current.mutate({ roadmapId: ROADMAP, reaction: LIKE }));

    expect(mocks.getByRoadmapId.setData).toHaveBeenCalledWith(
      { roadmapId: ROADMAP },
      expect.any(Function),
    );
    expect(optimisticUpdaterAt(0)(seeded)).toEqual({
      counts: [
        { reaction: SLAY, count: 1 },
        { reaction: LIKE, count: 1 },
      ],
      viewerReaction: LIKE,
    });
    expect(optimisticUpdaterAt(0)(undefined)).toEqual({
      counts: [{ reaction: LIKE, count: 1 }],
      viewerReaction: LIKE,
    });

    act(() =>
      result.current.mutate({ roadmapId: ROADMAP, reaction: undefined }),
    );

    expect(
      optimisticUpdaterAt(1)({
        counts: [{ reaction: LIKE, count: 1 }],
        viewerReaction: LIKE,
      }),
    ).toEqual({ counts: [], viewerReaction: null });
  });
});
