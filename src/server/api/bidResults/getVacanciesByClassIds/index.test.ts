import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getVacanciesByClassIds } from "./index";

const router = createTRPCRouter({ getVacanciesByClassIds });

describe("bidResults.getVacanciesByClassIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes three db calls and maps two classes that share (courseId, section) to the same vacancy while absent class is omitted", async () => {
    const mockAggregate = vi.fn().mockResolvedValue({
      _max: { acadYearStart: 2024 },
    });
    const mockClassesFindMany = vi.fn().mockResolvedValue([
      { id: "cl-1", courseId: "co-1", section: "G1" },
      { id: "cl-2", courseId: "co-1", section: "G1" },
      { id: "cl-3", courseId: "co-2", section: "G2" },
    ]);
    const mockBidResultFindMany = vi.fn().mockResolvedValue([
      {
        vacancy: 15,
        class: { id: "cl-1", courseId: "co-1", section: "G1" },
      },
    ]);

    const caller = makeCaller(router.createCaller, {
      acadTerm: { aggregate: mockAggregate },
      classes: { findMany: mockClassesFindMany },
      bidResult: { findMany: mockBidResultFindMany },
    });

    const result = await caller.getVacanciesByClassIds({
      classIds: ["cl-1", "cl-2", "cl-3"],
      bidWindowId: 5,
    });

    // Three db calls
    expect(mockAggregate).toHaveBeenCalledTimes(1);
    expect(mockClassesFindMany).toHaveBeenCalledTimes(1);
    expect(mockBidResultFindMany).toHaveBeenCalledTimes(1);

    // Filter args
    expect(mockClassesFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["cl-1", "cl-2", "cl-3"] } },
      select: { id: true, courseId: true, section: true },
    });
    expect(mockBidResultFindMany).toHaveBeenCalledWith({
      where: {
        bidWindowId: 5,
        bidWindow: {
          acadTerm: { acadYearStart: { gte: 2020 } },
        },
        class: {
          OR: [
            { courseId: "co-1", section: "G1" },
            { courseId: "co-2", section: "G2" },
          ],
        },
      },
      select: {
        vacancy: true,
        class: {
          select: { id: true, courseId: true, section: true },
        },
      },
      orderBy: { classId: "asc" },
    });

    // Output maps two classes sharing (courseId, section) to the same vacancy; cl-3 is absent
    expect(result).toEqual([
      { classId: "cl-1", vacancy: 15 },
      { classId: "cl-2", vacancy: 15 },
    ]);
  });

  it("rejects bidWindowId: 0", async () => {
    const caller = makeCaller(router.createCaller, {
      acadTerm: { aggregate: vi.fn() },
      classes: { findMany: vi.fn() },
      bidResult: { findMany: vi.fn() },
    });

    await expect(
      caller.getVacanciesByClassIds({
        classIds: ["cl-1"],
        bidWindowId: 0,
      }),
    ).rejects.toThrow();
  });

  it("rejects 0 classIds or >100 classIds", async () => {
    const caller = makeCaller(router.createCaller, {
      acadTerm: { aggregate: vi.fn() },
      classes: { findMany: vi.fn() },
      bidResult: { findMany: vi.fn() },
    });

    await expect(
      caller.getVacanciesByClassIds({
        classIds: [],
        bidWindowId: 1,
      }),
    ).rejects.toThrow();

    const classIds = Array.from({ length: 101 }, (_, i) => `cl-${i}`);
    await expect(
      caller.getVacanciesByClassIds({
        classIds,
        bidWindowId: 1,
      }),
    ).rejects.toThrow();
  });
});
