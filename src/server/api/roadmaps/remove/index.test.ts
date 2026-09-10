import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { remove } from "./index";

const router = createTRPCRouter({ remove });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("roadmaps.remove", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes the delete to the caller's roadmap (TOCTOU hardening)", async () => {
    const del = vi.fn().mockResolvedValue({ id: "r1" });
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ userId: "u1" }),
        delete: del,
      },
    };
    const caller = makeCaller(dbMock);
    await caller.remove({ roadmapId: "r1" });
    expect(del).toHaveBeenCalledWith({
      where: { id: "r1", userId: "u1" },
    });
  });
});
