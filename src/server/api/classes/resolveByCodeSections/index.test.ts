import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { resolveByCodeSections } from "./index";

const router = createTRPCRouter({ resolveByCodeSections });

describe("classes.resolveByCodeSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs one findMany when acadTermId is given, without window lookup", async () => {
    const mockClassesFindMany = vi.fn().mockResolvedValue([
      {
        id: "cl-1",
        section: "G1",
        course: { code: "IS111" },
      },
    ]);
    const mockWindowFindMany = vi.fn();

    const caller = makeCaller(router.createCaller, {
      classes: { findMany: mockClassesFindMany },
      bidWindow: { findMany: mockWindowFindMany },
    });

    const result = await caller.resolveByCodeSections({
      items: [{ courseCode: "IS111", section: "G1" }],
      acadTermId: "term-given",
    });

    expect(mockWindowFindMany).not.toHaveBeenCalled();
    expect(mockClassesFindMany).toHaveBeenCalledTimes(1);
    expect(mockClassesFindMany).toHaveBeenCalledWith({
      where: {
        acadTermId: "term-given",
        OR: [{ section: "G1", course: { code: "IS111" } }],
      },
      select: {
        id: true,
        section: true,
        course: { select: { code: true } },
      },
      orderBy: [{ acadTermId: "desc" }, { section: "asc" }, { id: "asc" }],
    });
    expect(result).toEqual([
      { courseCode: "IS111", section: "G1", classId: "cl-1" },
    ]);
  });

  it("runs one window lookup plus one findMany when acadTermId is absent", async () => {
    const mockWindowFindMany = vi.fn().mockResolvedValue([
      {
        id: 1,
        acadTermId: "term-from-window",
        opensAt: new Date(Date.now() - 10000),
        resultsAt: new Date(Date.now() + 10000),
        acadTerm: { id: "term-from-window" },
      },
    ]);
    const mockClassesFindMany = vi.fn().mockResolvedValue([
      {
        id: "cl-2",
        section: "G2",
        course: { code: "CS101" },
      },
    ]);

    const caller = makeCaller(router.createCaller, {
      bidWindow: { findMany: mockWindowFindMany },
      classes: { findMany: mockClassesFindMany },
    });

    const result = await caller.resolveByCodeSections({
      items: [{ courseCode: "CS101", section: "G2" }],
    });

    expect(mockWindowFindMany).toHaveBeenCalledTimes(1);
    expect(mockClassesFindMany).toHaveBeenCalledTimes(1);
    const findManyArg = mockClassesFindMany.mock.calls[0]![0] as {
      where: { acadTermId?: string };
    };
    expect(findManyArg.where.acadTermId).toBe("term-from-window");

    expect(result).toEqual([
      { courseCode: "CS101", section: "G2", classId: "cl-2" },
    ]);
  });

  it("exact section wins, no match gives null, and result order equals input order", async () => {
    const mockClassesFindMany = vi.fn().mockResolvedValue([
      {
        id: "cl-b",
        section: "G2",
        course: { code: "CS102" },
      },
      {
        id: "cl-a",
        section: "G1",
        course: { code: "CS101" },
      },
    ]);

    const caller = makeCaller(router.createCaller, {
      classes: { findMany: mockClassesFindMany },
    });

    const result = await caller.resolveByCodeSections({
      items: [
        { courseCode: "CS101", section: "G1" },
        { courseCode: "CS102", section: "G2" },
        { courseCode: "UNKNOWN", section: "G3" },
      ],
      acadTermId: "term-1",
    });

    // Input order is preserved
    expect(result).toEqual([
      { courseCode: "CS101", section: "G1", classId: "cl-a" },
      { courseCode: "CS102", section: "G2", classId: "cl-b" },
      { courseCode: "UNKNOWN", section: "G3", classId: null },
    ]);
  });

  it("rejects 0 items and >20 items", async () => {
    const caller = makeCaller(router.createCaller, {
      classes: { findMany: vi.fn() },
    });

    await expect(caller.resolveByCodeSections({ items: [] })).rejects.toThrow();

    const items = Array.from({ length: 21 }, (_, i) => ({
      courseCode: `CS${i}`,
      section: "G1",
    }));
    await expect(caller.resolveByCodeSections({ items })).rejects.toThrow();
  });
});
