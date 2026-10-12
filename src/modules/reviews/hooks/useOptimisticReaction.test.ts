// @vitest-environment jsdom
import { getQueryKey } from "@trpc/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as TrpcReact from "@/common/tools/trpc/react";
import type { Review, ReviewEngagement } from "@/common/types/reviews";
import { ReviewReactionType } from "@/generated/prisma/enums";

import type { Snapshot } from "./patch-review-caches";
import { useOptimisticReaction } from "./useOptimisticReaction";

type Vars = { reviewId: string; reaction?: ReviewReactionType };
type Callbacks = {
  onMutate: (vars: Vars) => Promise<{ prev?: Snapshot }>;
  onError: (
    error: { message?: string },
    vars: Vars,
    context?: { prev?: Snapshot },
  ) => void;
  onSettled: () => void;
};

const mocks = vi.hoisted(() => ({
  useUtils: vi.fn(),
  upsertUseMutation:
    vi.fn<(options: Callbacks) => { mutate: (vars: Vars) => void }>(),
  upsertMutate: vi.fn<(vars: Vars) => void>(),
  trackUseMutation: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock("@/common/hooks", () => ({
  useEdgeConfigs: () => ({ enableReviewEventsTracking: false }),
}));

// The real tRPC proxy and query client stay in place so the cache helpers run
// for real. Only the hooks that talk to the server are replaced.
vi.mock("@/common/tools/trpc/react", async (importOriginal) => {
  const actual = await importOriginal<typeof TrpcReact>();
  const api = new Proxy(actual.api, {
    get(target, prop): unknown {
      if (prop === "useUtils") return mocks.useUtils;
      if (prop === "reviewReactions") {
        return { upsert: { useMutation: mocks.upsertUseMutation } };
      }
      if (prop === "reviewEvents") {
        return { track: { useMutation: mocks.trackUseMutation } };
      }
      return Reflect.get(target, prop);
    },
  });
  return { ...actual, api };
});

const LIKE = ReviewReactionType.LIKE;
const SLAY = ReviewReactionType.SLAY;
const FUNNY = ReviewReactionType.FUNNY;

const SERVER_ENGAGEMENT: ReviewEngagement = {
  viewerVote: 0,
  viewerReaction: LIKE,
  reactionCounts: [{ reaction: LIKE, count: 5 }],
  shareCount: 0,
};

const getEngagementQuery = vi.fn(async () => ({ r1: SERVER_ENGAGEMENT }));

const review = (id: string, likeCount: number, engagement?: ReviewEngagement) =>
  ({ id, likeCount, engagement }) as Review;

const feedKey = () => [
  ...getQueryKey(TrpcReact.api.reviews.getByCourseCodeProtected),
  { input: { code: "IS215" }, type: "infinite" },
];

const seedFeed = (items: Review[]) => {
  TrpcReact.getQueryClient().setQueryData(feedKey(), {
    pages: [{ items }],
    pageParams: [undefined],
  });
};

const feedItems = () =>
  TrpcReact.getQueryClient().getQueryData<{
    pages: Array<{ items: Review[] }>;
  }>(feedKey())?.pages[0]?.items;

const callbacks = (): Callbacks => {
  const call = mocks.upsertUseMutation.mock.lastCall;
  if (!call) throw new Error("useMutation was not called");
  return call[0];
};

const renderOptimistic = () => renderHook(() => useOptimisticReaction());

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  TrpcReact.getQueryClient().clear();
  mocks.useUtils.mockReturnValue({
    client: { reviews: { getEngagement: { query: getEngagementQuery } } },
  });
  mocks.upsertUseMutation.mockReturnValue({ mutate: mocks.upsertMutate });
  seedFeed([review("r1", 3)]);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("reviews useOptimisticReaction (characterization)", () => {
  it("applies the reaction to the cache at once, then sends the last input after 300ms", () => {
    seedFeed([
      review("r1", 3, {
        viewerVote: 0,
        viewerReaction: SLAY,
        reactionCounts: [
          { reaction: SLAY, count: 2 },
          { reaction: FUNNY, count: 1 },
        ],
        shareCount: 0,
      }),
    ]);
    const { result } = renderOptimistic();

    act(() => result.current.mutate({ reviewId: "r1", reaction: LIKE }));

    expect(feedItems()?.[0]?.engagement).toEqual({
      viewerVote: 0,
      viewerReaction: LIKE,
      reactionCounts: [
        { reaction: SLAY, count: 1 },
        { reaction: FUNNY, count: 1 },
        { reaction: LIKE, count: 1 },
      ],
      shareCount: 0,
    });
    expect(mocks.upsertMutate).not.toHaveBeenCalled();

    act(() => result.current.mutate({ reviewId: "r1", reaction: undefined }));

    expect(feedItems()?.[0]?.engagement).toEqual({
      viewerVote: 0,
      viewerReaction: null,
      reactionCounts: [
        { reaction: SLAY, count: 1 },
        { reaction: FUNNY, count: 1 },
      ],
      shareCount: 0,
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mocks.upsertMutate).toHaveBeenCalledTimes(1);
    expect(mocks.upsertMutate).toHaveBeenCalledWith({
      reviewId: "r1",
      reaction: undefined,
    });
  });

  it("runs cancel, then snapshot, then invalidate on settle, using the last reviewId", async () => {
    const cancelSpy = vi.spyOn(TrpcReact.getQueryClient(), "cancelQueries");
    const { result } = renderOptimistic();
    const vars = { reviewId: "r1", reaction: LIKE };

    act(() => result.current.mutate(vars));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(mocks.upsertMutate.mock.calls[0]?.[0]).toBe(vars);

    const context = await callbacks().onMutate(vars);

    expect(cancelSpy).toHaveBeenCalledTimes(4);
    expect(context.prev).toEqual([[feedKey(), [review("r1", 3)]]]);
    // onMutate does not re-apply the optimistic write; the mutate call already did.
    expect(feedItems()?.[0]?.engagement?.reactionCounts).toEqual([
      { reaction: LIKE, count: 1 },
    ]);
    expect(getEngagementQuery).not.toHaveBeenCalled();

    callbacks().onSettled();

    expect(getEngagementQuery).toHaveBeenCalledWith({ reviewIds: ["r1"] });
    await vi.waitFor(() =>
      expect(feedItems()?.[0]?.engagement).toEqual(SERVER_ENGAGEMENT),
    );
  });

  it("restores the pre-optimistic cache through setQueryData on error", async () => {
    const setSpy = vi.spyOn(TrpcReact.getQueryClient(), "setQueryData");
    const { result } = renderOptimistic();
    const vars = { reviewId: "r1", reaction: LIKE };

    act(() => result.current.mutate(vars));
    const context = await callbacks().onMutate(vars);
    setSpy.mockClear();

    callbacks().onError({ message: "boom" }, vars, context);

    expect(setSpy).toHaveBeenCalledWith(feedKey(), expect.any(Function));
    expect(feedItems()).toEqual([review("r1", 3)]);
  });

  it("makes no cache writes or reads for the review when no mutate ran first, except cancelling every review query", async () => {
    const cancelSpy = vi.spyOn(TrpcReact.getQueryClient(), "cancelQueries");
    const setSpy = vi.spyOn(TrpcReact.getQueryClient(), "setQueryData");
    renderOptimistic();
    const vars = { reviewId: "r1", reaction: LIKE };

    const context = await callbacks().onMutate(vars);
    callbacks().onError({ message: "boom" }, vars, context);
    callbacks().onSettled();

    // cancel is not guarded by the input ref, so it still cancels all four procedures.
    expect(cancelSpy).toHaveBeenCalledTimes(4);
    expect(context.prev).toBeUndefined();
    expect(setSpy).not.toHaveBeenCalled();
    expect(getEngagementQuery).not.toHaveBeenCalled();
    expect(feedItems()).toEqual([review("r1", 3)]);
  });

  it("writes a snapshot handed to onError back into the cache even with no prior input (no guard)", () => {
    renderOptimistic();

    callbacks().onError(
      { message: "boom" },
      { reviewId: "r1" },
      {
        prev: [[feedKey(), [review("r1", 9)]]],
      },
    );

    expect(feedItems()).toEqual([review("r1", 9)]);
  });
});
