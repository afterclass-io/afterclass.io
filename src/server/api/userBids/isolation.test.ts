import { describe, expect, it, vi, beforeEach } from "vitest";

// Cross-user isolation: user A (session u1) must not be able to read or
// write user B's (u2) bids. Pure mock-db — no live Postgres.
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { remove } from "./remove";
import { setStatus } from "./setStatus";
import { upsert } from "./upsert";

const router = createTRPCRouter({ remove, setStatus, upsert });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("userBids cross-user isolation (A=u1 cannot touch B=u2 rows)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("remove on B's bid id → FORBIDDEN, row unchanged", async () => {
    const del = vi.fn();
    const dbMock = {
      userBid: {
        findUnique: vi.fn().mockResolvedValue({ userId: "u2" }),
        delete: del,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(caller.remove({ id: "b-of-B" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(del).not.toHaveBeenCalled();
  });

  it("setStatus on B's bid id → FORBIDDEN, row unchanged", async () => {
    const update = vi.fn();
    const dbMock = {
      userBid: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: "b-of-B",
            classId: "c1",
            bidAmount: 10,
            userId: "u2",
          }),
        update,
      },
      classes: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setStatus({ id: "b-of-B", status: "SECURED" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(update).not.toHaveBeenCalled();
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("upsert for B's class/window writes under A's key, never B's", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ id: "b-new" });
    const dbMock = {
      bidWindow: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      userBid: { upsert: upsertMock },
    };
    const caller = makeCaller(dbMock);
    await caller.upsert({ classId: "c-shared", bidWindowId: 2, bidAmount: 50 });
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0]![0] as {
      where: { userId_classId_bidWindowId: { userId: string } };
      create: { userId: string };
    };
    // Both the lookup key and the created row carry A's id — B's composite
    // key space (userId "u2") is unreachable through this procedure.
    expect(call.where.userId_classId_bidWindowId.userId).toBe("u1");
    expect(call.create.userId).toBe("u1");
  });
});
