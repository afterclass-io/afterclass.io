import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getBy } from "@/server/api/bidResults/getBy";
import { getAll } from "@/server/api/classes/getAll";

const mockGetEdgeConfig = vi.fn();
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

  describe("biddingProcedure", () => {
    it("allows unauthenticated calls when requireAuthForBidding is false", async () => {
      const dbMock = {
        acadTerm: {
          aggregate: vi
            .fn()
            .mockResolvedValue({ _max: { acadYearStart: 2026 } }),
        },
        bidResult: { findMany: vi.fn().mockResolvedValue([]) },
      };
      const caller = makeCaller(router.createCaller, dbMock, null);

      const result = await caller.bidResultsGetBy({
        courseCode: "CS101",
        section: "G1",
      });
      expect(result).toEqual([]);
    });

    it("throws UNAUTHORIZED for unauthenticated calls when requireAuthForBidding is true", async () => {
      mockGetEdgeConfig.mockResolvedValue({
        requireAuthForBidding: true,
      });

      const dbMock = {
        acadTerm: { aggregate: vi.fn() },
        bidResult: { findMany: vi.fn() },
      };
      const caller = makeCaller(router.createCaller, dbMock, null);

      await expect(
        caller.bidResultsGetBy({ courseCode: "CS101", section: "G1" }),
      ).rejects.toThrow("Sign in required to view bidding data");
    });

    it("allows authenticated users even when requireAuthForBidding is true without calling getEdgeConfig", async () => {
      const dbMock = {
        acadTerm: {
          aggregate: vi
            .fn()
            .mockResolvedValue({ _max: { acadYearStart: 2026 } }),
        },
        bidResult: { findMany: vi.fn().mockResolvedValue([]) },
      };
      const session = { user: { id: "user_1" } };
      const caller = makeCaller(router.createCaller, dbMock, session);

      const result = await caller.bidResultsGetBy({
        courseCode: "CS101",
        section: "G1",
      });
      expect(result).toEqual([]);
      // Fast path: bypasses Edge Config
      expect(mockGetEdgeConfig).not.toHaveBeenCalled();
    });
  });

  describe("classesProcedure", () => {
    it("throws UNAUTHORIZED for unauthenticated calls when requireAuthForClasses is true", async () => {
      mockGetEdgeConfig.mockResolvedValue({
        requireAuthForClasses: true,
      });

      const dbMock = {
        classes: { findMany: vi.fn() },
        bidWindow: { findFirst: vi.fn() },
      };
      const caller = makeCaller(router.createCaller, dbMock, null);

      await expect(
        caller.classesGetAll({ courseCode: "CS101" }),
      ).rejects.toThrow("Sign in required to view class schedule data");
    });

    it("allows authenticated users even when requireAuthForClasses is true without calling getEdgeConfig", async () => {
      const dbMock = {
        classes: { findMany: vi.fn().mockResolvedValue([]) },
        bidWindow: { findFirst: vi.fn().mockResolvedValue(null) },
      };
      const session = { user: { id: "user_1" } };
      const caller = makeCaller(router.createCaller, dbMock, session);

      const result = await caller.classesGetAll({
        id: "class_1",
        courseCode: "CS101",
      });
      expect(result).toEqual([]);
      expect(mockGetEdgeConfig).not.toHaveBeenCalled();
    });
  });
});
