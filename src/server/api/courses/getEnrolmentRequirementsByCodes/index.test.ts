import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getEnrolmentRequirementsByCodes } from "./index";

const router = createTRPCRouter({ getEnrolmentRequirementsByCodes });

describe("courses.getEnrolmentRequirementsByCodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls findMany once with where code in codes and select code and enrolmentRequirements", async () => {
    const mockFindMany = vi.fn().mockResolvedValue([
      { code: "CS101", enrolmentRequirements: "Pre-req: None" },
      { code: "IS111", enrolmentRequirements: null },
    ]);
    const caller = makeCaller(router.createCaller, {
      courses: { findMany: mockFindMany },
    });

    const result = await caller.getEnrolmentRequirementsByCodes({
      codes: ["CS101", "IS111"],
    });

    expect(result).toEqual([
      { code: "CS101", enrolmentRequirements: "Pre-req: None" },
      { code: "IS111", enrolmentRequirements: null },
    ]);
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { code: { in: ["CS101", "IS111"] } },
      select: { code: true, enrolmentRequirements: true },
    });
  });

  it("rejects 0 codes", async () => {
    const caller = makeCaller(router.createCaller, {
      courses: { findMany: vi.fn() },
    });

    await expect(
      caller.getEnrolmentRequirementsByCodes({ codes: [] }),
    ).rejects.toThrow();
  });

  it("rejects 101 codes", async () => {
    const caller = makeCaller(router.createCaller, {
      courses: { findMany: vi.fn() },
    });

    const codes = Array.from({ length: 101 }, (_, i) => `CODE${i}`);
    await expect(
      caller.getEnrolmentRequirementsByCodes({ codes }),
    ).rejects.toThrow();
  });
});
