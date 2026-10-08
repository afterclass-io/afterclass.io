import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { upsertMany } from "./index";

const router = createTRPCRouter({ upsertMany });

describe("userBids.upsertMany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs two findMany reads and one $transaction for valid entries", async () => {
    const mockWindowFindMany = vi
      .fn()
      .mockResolvedValue([{ id: 1, acadTermId: "term-1" }]);
    const mockClassesFindMany = vi
      .fn()
      .mockResolvedValue([{ id: "c1", acadTermId: "term-1" }]);
    const mockTransaction = vi.fn().mockResolvedValue([
      {
        id: "b1",
        userId: "u1",
        classId: "c1",
        bidWindowId: 1,
        bidAmount: 100,
        notes: "my bid",
      },
    ]);
    const mockUpsert = vi.fn();

    const caller = makeCaller(router.createCaller, {
      bidWindow: { findMany: mockWindowFindMany },
      classes: { findMany: mockClassesFindMany },
      userBid: { upsert: mockUpsert },
      $transaction: mockTransaction,
    });

    const result = await caller.upsertMany({
      entries: [
        { classId: "c1", bidWindowId: 1, bidAmount: 100, notes: "my bid" },
      ],
    });

    expect(mockWindowFindMany).toHaveBeenCalledTimes(1);
    expect(mockClassesFindMany).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        ok: true,
        bid: {
          id: "b1",
          userId: "u1",
          classId: "c1",
          bidWindowId: 1,
          bidAmount: 100,
          notes: "my bid",
        },
      },
    ]);
  });

  it("unknown window gives { ok: false, message: 'Unknown bid window' } for that entry only", async () => {
    const mockWindowFindMany = vi
      .fn()
      .mockResolvedValue([{ id: 1, acadTermId: "term-1" }]);
    const mockClassesFindMany = vi.fn().mockResolvedValue([
      { id: "c1", acadTermId: "term-1" },
      { id: "c2", acadTermId: "term-1" },
    ]);
    const mockTransaction = vi.fn().mockResolvedValue([
      {
        id: "b1",
        userId: "u1",
        classId: "c1",
        bidWindowId: 1,
        bidAmount: 100,
      },
    ]);
    const mockUpsert = vi.fn();

    const caller = makeCaller(router.createCaller, {
      bidWindow: { findMany: mockWindowFindMany },
      classes: { findMany: mockClassesFindMany },
      userBid: { upsert: mockUpsert },
      $transaction: mockTransaction,
    });

    const result = await caller.upsertMany({
      entries: [
        { classId: "c1", bidWindowId: 1, bidAmount: 100 },
        { classId: "c2", bidWindowId: 999, bidAmount: 50 },
      ],
    });

    expect(result[0]?.ok).toBe(true);
    if (result[0]?.ok) {
      expect(result[0].bid).toMatchObject({ id: "b1" });
    }
    expect(result[1]).toEqual({
      ok: false,
      message: "Unknown bid window",
    });
  });

  it("wrong-term class gives Class does not belong to this academic term", async () => {
    const mockWindowFindMany = vi
      .fn()
      .mockResolvedValue([{ id: 1, acadTermId: "term-1" }]);
    const mockClassesFindMany = vi
      .fn()
      .mockResolvedValue([{ id: "c1", acadTermId: "term-different" }]);

    const caller = makeCaller(router.createCaller, {
      bidWindow: { findMany: mockWindowFindMany },
      classes: { findMany: mockClassesFindMany },
      userBid: { upsert: vi.fn() },
      $transaction: vi.fn(),
    });

    const result = await caller.upsertMany({
      entries: [{ classId: "c1", bidWindowId: 1, bidAmount: 100 }],
    });

    expect(result).toEqual([
      {
        ok: false,
        message: "Class does not belong to this academic term",
      },
    ]);
  });

  it("omitted notes gives update without notes", async () => {
    let capturedArgs: { update: Record<string, unknown> } | undefined;
    const mockWindowFindMany = vi
      .fn()
      .mockResolvedValue([{ id: 1, acadTermId: "term-1" }]);
    const mockClassesFindMany = vi
      .fn()
      .mockResolvedValue([{ id: "c1", acadTermId: "term-1" }]);
    const mockUpsert = vi.fn((args: { update: Record<string, unknown> }) => {
      capturedArgs = args;
      return args;
    });
    const mockTransaction = vi.fn().mockResolvedValue([{ id: "b1" }]);

    const caller = makeCaller(router.createCaller, {
      bidWindow: { findMany: mockWindowFindMany },
      classes: { findMany: mockClassesFindMany },
      userBid: { upsert: mockUpsert },
      $transaction: mockTransaction,
    });

    await caller.upsertMany({
      entries: [{ classId: "c1", bidWindowId: 1, bidAmount: 75 }],
    });

    expect(capturedArgs).toBeDefined();
    expect(capturedArgs?.update).not.toHaveProperty("notes");
    expect(capturedArgs?.update).toEqual({ bidAmount: 75 });
  });

  it("handles database error in $transaction by marking all valid entries as failed", async () => {
    const mockWindowFindMany = vi
      .fn()
      .mockResolvedValue([{ id: 1, acadTermId: "term-1" }]);
    const mockClassesFindMany = vi
      .fn()
      .mockResolvedValue([{ id: "c1", acadTermId: "term-1" }]);
    const mockTransaction = vi
      .fn()
      .mockRejectedValue(new Error("DB connection failure"));

    const caller = makeCaller(router.createCaller, {
      bidWindow: { findMany: mockWindowFindMany },
      classes: { findMany: mockClassesFindMany },
      userBid: { upsert: vi.fn() },
      $transaction: mockTransaction,
    });

    const result = await caller.upsertMany({
      entries: [{ classId: "c1", bidWindowId: 1, bidAmount: 100 }],
    });

    expect(result).toEqual([
      {
        ok: false,
        message: "DB connection failure",
      },
    ]);
  });

  it("rejects 0 entries and >20 entries", async () => {
    const caller = makeCaller(router.createCaller, {
      bidWindow: { findMany: vi.fn() },
      classes: { findMany: vi.fn() },
    });

    await expect(caller.upsertMany({ entries: [] })).rejects.toThrow();

    const entries = Array.from({ length: 21 }, (_, i) => ({
      classId: `c${i}`,
      bidWindowId: 1,
      bidAmount: 10,
    }));
    await expect(caller.upsertMany({ entries })).rejects.toThrow();
  });
});
