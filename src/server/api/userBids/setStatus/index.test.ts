import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { Prisma } from "@/generated/prisma/client";
import { setStatus } from "./index";

const router = createTRPCRouter({ setStatus });

// The bid amount and the class are read inside the transaction. The pre-read
// only proves ownership, so its row carries the owner id and nothing else.
const ownedByCaller = { id: "b1", userId: "u1" };
const txBid = (bidAmount = 10) =>
  vi.fn().mockResolvedValue({
    id: "b1",
    userId: "u1",
    classId: "c1",
    bidAmount,
  });
const txClasses = () => ({
  findUnique: vi
    .fn()
    .mockResolvedValue({ acadTermId: "term-a", courseId: "course-1" }),
});

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("userBids.setStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes the in-tx update to the caller's bid (TOCTOU hardening)", async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: "b1", status: "DROPPED", acadTermId: "term-a" });
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: txBid(),
        update,
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    await caller.setStatus({ id: "b1", status: "DROPPED" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "b1", userId: "u1" } }),
    );
  });

  it("calls $transaction with Serializable isolation for SECURED and runs duplicate/budget checks inside tx", async () => {
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: txBid(),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: "b1", status: "SECURED" }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      userBidBudget: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      userTimetable: {
        findFirst: vi.fn().mockResolvedValue({ id: "t1" }),
      },
      userTimetableSlot: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(
        async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) =>
          fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    const result = await caller.setStatus({ id: "b1", status: "SECURED" });
    expect(result).toMatchObject({
      id: "b1",
      status: "SECURED",
      acadTermId: "term-a",
    });
    expect(dbMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(
      (dbMock.userBid as { findFirst?: unknown }).findFirst,
    ).toBeUndefined();
    expect(tx.userBid.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        status: "SECURED",
        id: { not: "b1" },
        class: { courseId: "course-1", acadTermId: "term-a" },
      },
      select: { id: true },
    });
    expect(tx.userBidBudget.findUnique).toHaveBeenCalledWith({
      where: { userId_acadTermId: { userId: "u1", acadTermId: "term-a" } },
    });
  });

  it("calls $transaction without Serializable option for DROPPED", async () => {
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: txBid(),
        update: vi.fn().mockResolvedValue({ id: "b1", status: "DROPPED" }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(
        async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) =>
          fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    await caller.setStatus({ id: "b1", status: "DROPPED" });
    expect(dbMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      undefined,
    );
  });

  it("rejects BAD_REQUEST when duplicate section found inside tx and does not update bid", async () => {
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: txBid(),
        findFirst: vi.fn().mockResolvedValue({ id: "existing-bid" }),
        update: vi.fn(),
      },
    };
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(
        async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) =>
          fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setStatus({ id: "b1", status: "SECURED" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "You already have a secured section for this course in this term. Drop the existing section before securing another.",
    });
    expect(tx.userBid.update).not.toHaveBeenCalled();
  });

  it("rejects BAD_REQUEST when budget exceeded inside tx", async () => {
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: txBid(30),
        findFirst: vi.fn().mockResolvedValue(null),
        aggregate: vi.fn().mockResolvedValue({ _sum: { bidAmount: 80 } }),
        update: vi.fn(),
      },
      userBidBudget: {
        findUnique: vi.fn().mockResolvedValue({ balance: 100 }),
      },
    };
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(
        async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) =>
          fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setStatus({ id: "b1", status: "SECURED" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Marking this bid as secured would exceed your budget",
    });
    expect(tx.userBid.update).not.toHaveBeenCalled();
  });

  it("reads the bid amount inside the transaction, not from the pre-read", async () => {
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: txBid(30),
        findFirst: vi.fn().mockResolvedValue(null),
        aggregate: vi.fn().mockResolvedValue({ _sum: { bidAmount: 80 } }),
        update: vi.fn(),
      },
      userBidBudget: {
        findUnique: vi.fn().mockResolvedValue({ balance: 100 }),
      },
    };
    const dbMock = {
      // The pre-read row holds no amount: only the in-tx read can supply 30.
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(
        async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) =>
          fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setStatus({ id: "b1", status: "SECURED" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(tx.userBid.findUnique).toHaveBeenCalledWith({
      where: { id: "b1" },
      select: { id: true, userId: true, classId: true, bidAmount: true },
    });
    expect(tx.classes.findUnique).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: { acadTermId: true, courseId: true },
    });
    expect(tx.userBid.update).not.toHaveBeenCalled();
  });

  it("rejects FORBIDDEN when the in-tx read shows another owner and does not update", async () => {
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "b1", userId: "u2", classId: "c1" }),
        update: vi.fn(),
      },
    };
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setStatus({ id: "b1", status: "DROPPED" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(tx.userBid.update).not.toHaveBeenCalled();
  });

  it("rejects BAD_REQUEST when the class is missing inside the tx", async () => {
    const tx = {
      classes: { findUnique: vi.fn().mockResolvedValue(null) },
      userBid: { findUnique: txBid(), update: vi.fn() },
    };
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setStatus({ id: "b1", status: "DROPPED" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Class not found",
    });
    expect(tx.userBid.update).not.toHaveBeenCalled();
  });

  it("retries and succeeds when first $transaction call rejects with P2034", async () => {
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: txBid(),
        update: vi.fn().mockResolvedValue({ id: "b1", status: "DROPPED" }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const conflictError = new Prisma.PrismaClientKnownRequestError("conflict", {
      code: "P2034",
      clientVersion: "7.10.0",
    });
    let attempts = 0;
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        attempts++;
        if (attempts === 1) {
          throw conflictError;
        }
        return fn(tx);
      }),
    };
    const caller = makeCaller(dbMock);
    const res = await caller.setStatus({ id: "b1", status: "DROPPED" });
    expect(res).toMatchObject({ id: "b1", status: "DROPPED" });
    expect(dbMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it("rejects with CONFLICT after three consecutive P2034 rejections", async () => {
    const conflictError = new Prisma.PrismaClientKnownRequestError("conflict", {
      code: "P2034",
      clientVersion: "7.10.0",
    });
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn().mockRejectedValue(conflictError),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setStatus({ id: "b1", status: "DROPPED" }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Another change is in progress. Try again.",
    });
    expect(dbMock.$transaction).toHaveBeenCalledTimes(3);
  });

  it("retries when $transaction rejects with P2002", async () => {
    const tx = {
      classes: txClasses(),
      userBid: {
        findUnique: txBid(),
        update: vi.fn().mockResolvedValue({ id: "b1", status: "DROPPED" }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      "unique constraint",
      { code: "P2002", clientVersion: "7.10.0" },
    );
    let attempts = 0;
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        attempts++;
        if (attempts === 1) {
          throw uniqueError;
        }
        return fn(tx);
      }),
    };
    const caller = makeCaller(dbMock);
    const res = await caller.setStatus({ id: "b1", status: "DROPPED" });
    expect(res).toMatchObject({ id: "b1", status: "DROPPED" });
    expect(dbMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it("rethrows non-conflict errors at once after 1 attempt", async () => {
    const dbMock = {
      userBid: { findUnique: vi.fn().mockResolvedValue(ownedByCaller) },
      $transaction: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setStatus({ id: "b1", status: "DROPPED" }),
    ).rejects.toThrow("boom");
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
