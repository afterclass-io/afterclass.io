import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getBy } from "@/server/api/bidResults/getBy";
import { getAll } from "@/server/api/classes/getAll";
import type { EdgeConfig } from "@/server/ecfg/config";

const mockGetEdgeConfig = vi.fn<() => Promise<Partial<EdgeConfig>>>();
vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: () => mockGetEdgeConfig(),
}));

const router = createTRPCRouter({
  bidResultsGetBy: getBy,
  classesGetAll: getAll,
});

describe("Operational Gates (Edge Config Gating)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEdgeConfig.mockResolvedValue({
      requireAuthForBidding: false,
      requireAuthForClasses: false,
    });
  });

  it("allows anonymous callers through when requireAuthForBidding is false", async () => {
    mockGetEdgeConfig.mockResolvedValue({ requireAuthForBidding: false });
    const caller = makeCaller(router.createCaller, {}, null);
    // May reject with DB error in mock context, but must NOT reject with UNAUTHORIZED
    try {
      await caller.bidResultsGetBy({
        courseCode: "CS101",
      });
    } catch (err: unknown) {
      expect((err as { code?: string }).code).not.toBe("UNAUTHORIZED");
    }
  });

  it("throws UNAUTHORIZED for anonymous callers when requireAuthForBidding is true", async () => {
    mockGetEdgeConfig.mockResolvedValue({ requireAuthForBidding: true });
    const caller = makeCaller(router.createCaller, {}, null);
    try {
      await caller.bidResultsGetBy({
        courseCode: "CS101",
      });
      expect.unreachable("should have thrown");
    } catch (err: unknown) {
      expect((err as { code?: string }).code).toBe("UNAUTHORIZED");
    }
  });

  it("allows authenticated callers even when requireAuthForBidding is true (fast-path)", async () => {
    mockGetEdgeConfig.mockResolvedValue({ requireAuthForBidding: true });
    const caller = makeCaller(
      router.createCaller,
      {},
      {
        user: { id: "user-123" },
      },
    );
    try {
      await caller.bidResultsGetBy({
        courseCode: "CS101",
      });
    } catch (err: unknown) {
      expect((err as { code?: string }).code).not.toBe("UNAUTHORIZED");
    }
    // Fast path: getEdgeConfig shouldn't even be called for authenticated sessions!
    expect(mockGetEdgeConfig).not.toHaveBeenCalled();
  });

  it("throws UNAUTHORIZED for anonymous callers when requireAuthForClasses is true", async () => {
    mockGetEdgeConfig.mockResolvedValue({ requireAuthForClasses: true });
    const caller = makeCaller(router.createCaller, {}, null);
    try {
      await caller.classesGetAll({});
      expect.unreachable("should have thrown");
    } catch (err: unknown) {
      expect((err as { code?: string }).code).toBe("UNAUTHORIZED");
    }
  });

  it("allows authenticated callers even when requireAuthForClasses is true", async () => {
    mockGetEdgeConfig.mockResolvedValue({ requireAuthForClasses: true });
    const caller = makeCaller(
      router.createCaller,
      {},
      {
        user: { id: "user-123" },
      },
    );
    try {
      await caller.classesGetAll({});
    } catch (err: unknown) {
      expect((err as { code?: string }).code).not.toBe("UNAUTHORIZED");
    }
    expect(mockGetEdgeConfig).not.toHaveBeenCalled();
  });
});
