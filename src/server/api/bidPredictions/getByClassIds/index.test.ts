import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getByClassIds } from "./index";

const router = createTRPCRouter({ getByClassIds });

describe("bidPredictions.getByClassIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findMany args equal { where: { classId: { in } }, include: { bidWindow: true }, orderBy: [{ classId: 'asc' }, { bidWindow: { resultsAt: 'desc' } }], distinct: ['classId'] }", async () => {
    const mockFindMany = vi.fn().mockResolvedValue([
      {
        classId: "c1",
        medianPredicted: 10,
        bidWindow: { resultsAt: new Date("2024-09-01") },
      },
    ]);
    const caller = makeCaller(router.createCaller, {
      bidPrediction: { findMany: mockFindMany },
    });

    const result = await caller.getByClassIds({ classIds: ["c1", "c2"] });

    expect(result).toEqual([
      {
        classId: "c1",
        medianPredicted: 10,
        bidWindow: { resultsAt: new Date("2024-09-01") },
      },
    ]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { classId: { in: ["c1", "c2"] } },
      include: { bidWindow: true },
      orderBy: [{ classId: "asc" }, { bidWindow: { resultsAt: "desc" } }],
      distinct: ["classId"],
    });
  });

  it("rejects 0 classIds", async () => {
    const caller = makeCaller(router.createCaller, {
      bidPrediction: { findMany: vi.fn() },
    });

    await expect(caller.getByClassIds({ classIds: [] })).rejects.toThrow();
  });

  it("rejects 101 classIds", async () => {
    const caller = makeCaller(router.createCaller, {
      bidPrediction: { findMany: vi.fn() },
    });

    const classIds = Array.from({ length: 101 }, (_, i) => `c${i}`);
    await expect(caller.getByClassIds({ classIds })).rejects.toThrow();
  });
});
