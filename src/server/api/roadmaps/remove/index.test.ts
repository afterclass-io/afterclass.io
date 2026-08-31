import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { remove } from "./index";

const router = createTRPCRouter({ remove });

describe("roadmaps.remove", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userRoadmap: { findUnique: vi.fn(), delete: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.remove({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("deletes an owned roadmap and returns the deleted row", async () => {
    const del = vi.fn().mockResolvedValue({ id: "r1" });
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ userId: "u1" }),
        delete: del,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.remove({ roadmapId: "r1" });

    expect(result).toEqual({ id: "r1" });
    expect(del).toHaveBeenCalledWith({ where: { id: "r1" } });
  });

  it("forbids removing a roadmap owned by another user", async () => {
    const del = vi.fn();
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ userId: "someone-else" }),
        delete: del,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.remove({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(del).not.toHaveBeenCalled();
  });

  it("forbids removing a roadmap that does not exist", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.remove({ roadmapId: "missing" })).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
      },
    );
  });
});
