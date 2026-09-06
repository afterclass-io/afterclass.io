import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { setStatus } from "./index";

const router = createTRPCRouter({ setStatus });

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
      userBid: { update, updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    const dbMock = {
      userBid: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: "b1",
            classId: "c1",
            bidAmount: 10,
            userId: "u1",
          }),
      },
      classes: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ acadTermId: "term-a", courseId: "course-1" }),
      },
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
});
