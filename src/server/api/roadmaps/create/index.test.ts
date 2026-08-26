import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { create } from "./index";

const router = createTRPCRouter({ create });

describe("roadmaps.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userRoadmap: { create: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.create({ name: "Plan" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("creates a roadmap owned by the caller and returns it", async () => {
    const row = { id: "r1", userId: "u1", name: "Plan" };
    const dbMock = {
      userRoadmap: { create: vi.fn().mockResolvedValue(row) },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.create({ name: "Plan" });

    expect(result).toEqual(row);
    expect(dbMock.userRoadmap.create).toHaveBeenCalledWith({
      data: { userId: "u1", name: "Plan" },
    });
  });

  it("rejects an empty name", async () => {
    const dbMock = { userRoadmap: { create: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.create({ name: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMock.userRoadmap.create).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 100 characters", async () => {
    const dbMock = { userRoadmap: { create: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.create({ name: "x".repeat(101) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.userRoadmap.create).not.toHaveBeenCalled();
  });
});
