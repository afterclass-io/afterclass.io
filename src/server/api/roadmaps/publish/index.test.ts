import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { publish } from "./index";

const router = createTRPCRouter({ publish });

const verified = { user: { id: "u1", isVerified: true } };

describe("roadmaps.publish", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userRoadmap: { findUnique: vi.fn(), update: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.publish({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("publishes an owned roadmap: PUBLIC, snapshots facultyId, stamps publishedAt", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ userId: "u1", facultyId: 3 }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock, verified);

    const result = await caller.publish({ roadmapId: "r1" });

    expect(result).toEqual({ success: true });
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        visibility: "PUBLIC",
        facultyId: 3,
        publishedAt: expect.any(Date) as Date,
      },
    });
  });

  it("forbids unverified users before any ownership lookup", async () => {
    const dbMock = {
      userRoadmap: { findUnique: vi.fn(), update: vi.fn() },
    };
    // default session has no isVerified
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.publish({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only verified users can publish roadmaps",
    });
    expect(dbMock.userRoadmap.findUnique).not.toHaveBeenCalled();
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });

  it("forbids publishing a roadmap owned by another user", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ userId: "someone-else", facultyId: null }),
        update: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock, verified);

    await expect(caller.publish({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });

  it("forbids publishing a roadmap that does not exist", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock, verified);

    await expect(caller.publish({ roadmapId: "missing" })).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });
});
