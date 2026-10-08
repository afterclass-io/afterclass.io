import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getByUser } from "./index";

const router = createTRPCRouter({ getByUser });

describe("reviewVotes.getByUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries by (reviewId, session user)", async () => {
    const findFirst = vi.fn().mockResolvedValue({ weight: 1 });
    const caller = makeCaller(router.createCaller, { reviewVotes: { findFirst } });

    const result = await caller.getByUser({ reviewId: "rv1" });

    expect(result).toEqual({ weight: 1 });
    expect(findFirst).toHaveBeenCalledWith({
      where: { voterId: "u1", reviewId: "rv1" },
    });
  });

  it("ignores a client-supplied userId and binds to the session user", async () => {
    const findFirst = vi.fn().mockResolvedValue({ weight: 1 });
    const caller = makeCaller(router.createCaller, { reviewVotes: { findFirst } });

    await caller.getByUser({ userId: "u2", reviewId: "rv1" } as never);

    expect(findFirst).toHaveBeenCalledWith({
      where: { voterId: "u1", reviewId: "rv1" },
    });
  });
});
