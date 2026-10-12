import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import {
  copyRoadmapToUser,
  loadCopyableRoadmap,
} from "@/server/api/roadmaps/copyRoadmap";
import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
} from "@/server/db-errors";
import { copyPublic } from "./copyPublic";
import { copyShared } from "@/server/api/sharing/copyShared";

vi.mock("@/server/api/roadmaps/copyRoadmap", () => ({
  loadCopyableRoadmap: vi.fn(),
  copyRoadmapToUser: vi.fn(),
}));

vi.mock("@/server/db-errors", () => ({
  isForeignKeyViolation: vi.fn(),
  isUniqueConstraintViolation: vi.fn(),
}));

const router = createTRPCRouter({ copyPublic, copyShared });

type ProcedureName = "copyPublic" | "copyShared";

// Source owned by someone other than the caller (u1).
const source = {
  userId: "author",
  name: "Grad Plan",
  description: "d",
  entries: [],
};

function invoke(name: ProcedureName) {
  const caller = makeCaller(router.createCaller, {});
  return name === "copyPublic"
    ? caller.copyPublic({ roadmapId: "r1" })
    : caller.copyShared({ token: "tok" });
}

beforeEach(() => {
  vi.resetAllMocks();
  // Fixture is a partial Prisma row, so cast it to the mocked return type.
  vi.mocked(loadCopyableRoadmap).mockResolvedValue(source as never);
  vi.mocked(isForeignKeyViolation).mockReturnValue(false);
  vi.mocked(isUniqueConstraintViolation).mockReturnValue(false);
});

describe.each(["copyPublic", "copyShared"] as const)(
  "roadmaps.%s error mapping",
  (name) => {
    it("throws NOT_FOUND when the source roadmap is not found", async () => {
      vi.mocked(loadCopyableRoadmap).mockResolvedValue(null);
      await expect(invoke(name)).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(copyRoadmapToUser).not.toHaveBeenCalled();
    });

    it("maps a foreign-key violation to BAD_REQUEST", async () => {
      const fkErr = new Error("fk");
      vi.mocked(copyRoadmapToUser).mockRejectedValue(fkErr);
      vi.mocked(isForeignKeyViolation).mockReturnValue(true);
      await expect(invoke(name)).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Cannot copy this roadmap — it contains an unknown course.",
      });
      expect(isForeignKeyViolation).toHaveBeenCalledWith(fkErr);
    });

    it("maps a unique-constraint violation to CONFLICT", async () => {
      const uniqueErr = new Error("unique");
      vi.mocked(copyRoadmapToUser).mockRejectedValue(uniqueErr);
      vi.mocked(isUniqueConstraintViolation).mockReturnValue(true);
      await expect(invoke(name)).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Duplicate course detected — refresh and try again.",
      });
      expect(isUniqueConstraintViolation).toHaveBeenCalledWith(uniqueErr);
    });

    it("rethrows any other error, which tRPC wraps as INTERNAL_SERVER_ERROR", async () => {
      const boom = new Error("boom");
      vi.mocked(copyRoadmapToUser).mockRejectedValue(boom);
      const caught = await invoke(name).catch((e: unknown) => e);
      expect(caught).toBeInstanceOf(TRPCError);
      expect(caught).toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "boom",
      });
      expect((caught as TRPCError).cause).toBe(boom);
    });
  },
);

describe("roadmaps.copyPublic own-roadmap guard", () => {
  it("throws BAD_REQUEST before any copy when the caller owns the source", async () => {
    vi.mocked(loadCopyableRoadmap).mockResolvedValue({
      ...source,
      userId: "u1",
    } as never);
    await expect(invoke("copyPublic")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "You cannot copy your own roadmap",
    });
    expect(copyRoadmapToUser).not.toHaveBeenCalled();
  });
});
