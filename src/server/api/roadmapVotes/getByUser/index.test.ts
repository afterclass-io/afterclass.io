import { describe, expect, it, vi, beforeEach } from "vitest";

import { createTRPCRouter } from "@/server/api/trpc";
import { getByUser } from "./index";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

const router = createTRPCRouter({ getByUser });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("roadmapVotes.getByUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects calls without roadmapId", async () => {
    const caller = makeCaller({ roadmapVote: { findFirst: vi.fn() } });
    await expect(caller.getByUser({} as never)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("queries by (roadmapId, session user) hitting the unique index", async () => {
    const findFirst = vi.fn().mockResolvedValue({ weight: 1 });
    const caller = makeCaller({ roadmapVote: { findFirst } });

    const result = await caller.getByUser({ roadmapId: "r1" });

    expect(result).toEqual({ weight: 1 });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "u1", roadmapId: "r1" },
    });
  });
});
