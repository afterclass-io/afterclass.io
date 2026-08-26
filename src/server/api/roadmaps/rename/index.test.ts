import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { rename } from "./index";

const router = createTRPCRouter({ rename });

// Caller "u1" owns roadmap "r1"; `update` is a bare spy tests can assert on.
const ownedDb = () => ({
  userRoadmap: {
    findUnique: vi.fn().mockResolvedValue({ userId: "u1" }),
    update: vi.fn().mockResolvedValue({ id: "r1", name: "New" }),
  },
});

describe("roadmaps.rename", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, ownedDb(), null);
    await expect(
      caller.rename({ roadmapId: "r1", name: "New" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("updates name and description on an owned roadmap", async () => {
    const dbMock = ownedDb();
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.rename({
      roadmapId: "r1",
      name: "New",
      description: "notes",
    });

    expect(result).toEqual({ id: "r1", name: "New" });
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { name: "New", description: "notes" },
    });
  });

  it("omits description from the update when not provided", async () => {
    // Prisma reads `description: undefined` as "leave this column alone", so an
    // omitted description preserves the stored value rather than clearing it.
    const dbMock = ownedDb();
    const caller = makeCaller(router.createCaller, dbMock);

    await caller.rename({ roadmapId: "r1", name: "New" });

    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { name: "New", description: undefined },
    });
  });

  // Caller owns the roadmap, so a BAD_REQUEST can only come from Zod input
  // validation (not requireOwnedRoadmap's FORBIDDEN).
  it.each<[string, { name: string; description?: string }]>([
    ["an empty name", { name: "" }],
    ["a name longer than 100 characters", { name: "x".repeat(101) }],
    [
      "a description longer than 500 characters",
      { name: "New", description: "x".repeat(501) },
    ],
  ])("rejects %s", async (_label, input) => {
    const dbMock = ownedDb();
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.rename({ roadmapId: "r1", ...input }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });

  it("forbids renaming a roadmap owned by another user", async () => {
    const dbMock = ownedDb();
    dbMock.userRoadmap.findUnique.mockResolvedValue({ userId: "someone-else" });
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(
      caller.rename({ roadmapId: "r1", name: "New" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });
});
