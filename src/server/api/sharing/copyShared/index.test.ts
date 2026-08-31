import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { copyShared } from "./index";

const router = createTRPCRouter({ copyShared });

const source = {
  name: "Grad Plan",
  description: "d",
  entries: [{ courseId: "c1", yearNumber: 1, term: "T1", sortOrder: 0 }],
};

/** loadCopyableRoadmap uses userRoadmap.findUnique; copyRoadmapToUser uses userRoadmap.create. */
function makeDb(
  opts: {
    findUnique?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
  } = {},
) {
  return {
    userRoadmap: {
      findUnique: opts.findUnique ?? vi.fn().mockResolvedValue(source),
      create: opts.create ?? vi.fn().mockResolvedValue({ id: "new" }),
    },
  };
}

describe("sharing.copyShared", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, makeDb(), null);
    await expect(caller.copyShared({ token: "tok" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws NOT_FOUND when no roadmap matches the token", async () => {
    const caller = makeCaller(
      router.createCaller,
      makeDb({ findUnique: vi.fn().mockResolvedValue(null) }),
    );
    await expect(caller.copyShared({ token: "tok" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("clones the source roadmap into the caller's account", async () => {
    const create = vi.fn().mockResolvedValue({ id: "new" });
    const caller = makeCaller(router.createCaller, makeDb({ create }));

    const result = await caller.copyShared({ token: "tok" });

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

  it("maps a Prisma unique-constraint error (P2002) to CONFLICT", async () => {
    const caller = makeCaller(
      router.createCaller,
      makeDb({ create: vi.fn().mockRejectedValue({ code: "P2002" }) }),
    );
    await expect(caller.copyShared({ token: "tok" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("maps a Prisma FK-constraint error (P2003) to INTERNAL_SERVER_ERROR", async () => {
    const caller = makeCaller(
      router.createCaller,
      makeDb({ create: vi.fn().mockRejectedValue({ code: "P2003" }) }),
    );
    await expect(caller.copyShared({ token: "tok" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("re-throws a non-Prisma error instead of mapping it to CONFLICT", async () => {
    const caller = makeCaller(
      router.createCaller,
      makeDb({ create: vi.fn().mockRejectedValue(new Error("boom")) }),
    );
    await expect(caller.copyShared({ token: "tok" })).rejects.toThrow("boom");
  });
});
