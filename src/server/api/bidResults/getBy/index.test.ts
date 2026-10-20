import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
// Anonymous callers need `classData` public; setup only.
vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: () => Promise.resolve({ publicData: { classData: true } }),
}));

import { getBy } from "./index";

const router = createTRPCRouter({ getBy });

describe("bidResults.getBy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters results to the last 5 academic years", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const dbMock = {
      acadTerm: {
        aggregate: vi.fn().mockResolvedValue({ _max: { acadYearStart: 2026 } }),
      },
      bidResult: { findMany },
    };
    const caller = makeCaller(router.createCaller, dbMock, null);

    await caller.getBy({ courseCode: "CS101", section: "G1" });

    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- expect.objectContaining returns any */
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bidWindow: expect.objectContaining({
            acadTerm: { acadYearStart: { gte: 2022 } },
          }),
        }),
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });
});
