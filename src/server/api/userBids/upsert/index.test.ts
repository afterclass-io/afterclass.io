import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { upsert } from "./index";

const router = createTRPCRouter({ upsert });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("userBids.upsert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a single native upsert keyed by (userId, classId, bidWindowId)", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ id: "b1" });
    const caller = makeCaller({
      bidWindow: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      userBid: { upsert: upsertMock },
    });

    const result = await caller.upsert({
      classId: "c1",
      bidWindowId: 2,
      bidAmount: 100,
      notes: "hi",
    });

    expect(result).toEqual({ id: "b1" });
    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        userId_classId_bidWindowId: {
          userId: "u1",
          classId: "c1",
          bidWindowId: 2,
        },
      },
      update: { bidAmount: 100, notes: "hi" },
      create: {
        userId: "u1",
        classId: "c1",
        bidWindowId: 2,
        bidAmount: 100,
        notes: "hi",
        status: "PLANNED",
      },
    });
  });

  it("does not touch status when updating an existing bid", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ id: "b1" });
    const caller = makeCaller({
      bidWindow: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      userBid: { upsert: upsertMock },
    });

    await caller.upsert({ classId: "c1", bidWindowId: 2, bidAmount: 50 });

    const call = upsertMock.mock.calls[0]![0] as {
      update: Record<string, unknown>;
    };
    expect(call.update).not.toHaveProperty("status");
    expect(call.update).toEqual({ bidAmount: 50, notes: undefined });
  });

  it("rejects a class paired with another term's window", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ id: "b1" });
    const caller = makeCaller({
      bidWindow: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-b" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      userBid: { upsert: upsertMock },
    });

    await expect(
      caller.upsert({
        classId: "class-in-term-A",
        bidWindowId: 7,
        bidAmount: 50,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown bid window", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ id: "b1" });
    const caller = makeCaller({
      bidWindow: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      userBid: { upsert: upsertMock },
    });

    await expect(
      caller.upsert({
        classId: "c1",
        bidWindowId: 999,
        bidAmount: 50,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
