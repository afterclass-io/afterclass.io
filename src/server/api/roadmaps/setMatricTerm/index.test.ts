import { describe, expect, it, vi, beforeEach } from "vitest";

// The Prisma client must never be instantiated in tests: mock the db module
// used by trpc.ts at import time. Also mock transitive dependencies pulled
// by @/server/api/trpc (same pattern as saveEntries/syncProgress tests).

import { createTRPCRouter } from "@/server/api/trpc";
import { setMatricTerm } from "./index";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

const router = createTRPCRouter({ setMatricTerm });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("roadmaps.setMatricTerm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets matricTermId for the owned roadmap", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          matricTermId: "AY202425T1",
        }),
      },
      acadTerm: {
        findUnique: vi.fn().mockResolvedValue({ id: "AY202425T1" }),
      },
    };
    const caller = makeCaller(dbMock);
    await caller.setMatricTerm({
      roadmapId: "r1",
      matricTermId: "AY202425T1",
    });
    expect(dbMock.acadTerm.findUnique).toHaveBeenCalledWith({
      where: { id: "AY202425T1" },
    });
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { matricTermId: "AY202425T1" },
    });
  });

  it("clears matricTermId when null is passed", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          matricTermId: null,
        }),
      },
      acadTerm: {
        findUnique: vi.fn(),
      },
    };
    const caller = makeCaller(dbMock);
    await caller.setMatricTerm({ roadmapId: "r1", matricTermId: null });
    expect(dbMock.acadTerm.findUnique).not.toHaveBeenCalled();
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { matricTermId: null },
    });
  });

  it("rejects roadmaps owned by another user", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u2",
        }),
        update: vi.fn(),
      },
      acadTerm: {
        findUnique: vi.fn(),
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setMatricTerm({ roadmapId: "r1", matricTermId: "AY202425T1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });
});
