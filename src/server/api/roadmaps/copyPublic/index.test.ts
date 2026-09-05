import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { copyPublic } from "./index";

const router = createTRPCRouter({ copyPublic });

// Public source owned by someone other than the caller (u1).
const source = {
  userId: "author",
  name: "Grad Plan",
  description: "d",
  entries: [{ courseId: "c1", yearNumber: 1, term: "T1", sortOrder: 0 }],
};

/** loadCopyableRoadmap uses userRoadmap.findFirst; copyRoadmapToUser uses userRoadmap.create. */
function makeDb(
  opts: {
    findFirst?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
  } = {},
) {
  return {
    userRoadmap: {
      findFirst: opts.findFirst ?? vi.fn().mockResolvedValue(source),
      create: opts.create ?? vi.fn().mockResolvedValue({ id: "new" }),
    },
  };
}

describe("roadmaps.copyPublic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, makeDb(), null);
    await expect(
      caller.copyPublic({ roadmapId: "r1" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("clones a public roadmap into the caller's account", async () => {
    const create = vi.fn().mockResolvedValue({ id: "new" });
    const caller = makeCaller(router.createCaller, makeDb({ create }));

    const result = await caller.copyPublic({ roadmapId: "r1" });

    expect(result).toEqual({ id: "new" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: "u1",
          name: "Grad Plan (copy)",
          description: "d",
          entries: {
            createMany: {
              data: [
                { courseId: "c1", yearNumber: 1, term: "T1", sortOrder: 0 },
              ],
            },
          },
        },
      }),
    );
  });

  it("throws NOT_FOUND when no public+published roadmap matches", async () => {
    const caller = makeCaller(
      router.createCaller,
      makeDb({ findFirst: vi.fn().mockResolvedValue(null) }),
    );
    await expect(
      caller.copyPublic({ roadmapId: "r1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when the caller already owns the source", async () => {
    const create = vi.fn();
    const caller = makeCaller(
      router.createCaller,
      makeDb({
        findFirst: vi.fn().mockResolvedValue({ ...source, userId: "u1" }),
        create,
      }),
    );
    await expect(
      caller.copyPublic({ roadmapId: "r1" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(create).not.toHaveBeenCalled();
  });

  it("maps a Prisma unique-constraint error (P2002) to CONFLICT", async () => {
    const caller = makeCaller(
      router.createCaller,
      makeDb({ create: vi.fn().mockRejectedValue({ code: "P2002" }) }),
    );
    await expect(
      caller.copyPublic({ roadmapId: "r1" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("maps a Prisma FK-constraint error (P2003) to INTERNAL_SERVER_ERROR", async () => {
    const caller = makeCaller(
      router.createCaller,
      makeDb({ create: vi.fn().mockRejectedValue({ code: "P2003" }) }),
    );
    await expect(
      caller.copyPublic({ roadmapId: "r1" }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to copy roadmap — source contains an invalid course",
    });
  });

  it("re-throws a non-Prisma error unchanged", async () => {
    const caller = makeCaller(
      router.createCaller,
      makeDb({ create: vi.fn().mockRejectedValue(new Error("boom")) }),
    );
    await expect(caller.copyPublic({ roadmapId: "r1" })).rejects.toThrow("boom");
  });
});
