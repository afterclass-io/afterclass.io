import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { remove } from "./index";

const router = createTRPCRouter({ remove });

describe("userBids.remove", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userBid: { findUnique: vi.fn(), delete: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.remove({ id: "b1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("deletes the bid and returns success when the caller owns it", async () => {
    const del = vi.fn().mockResolvedValue({ id: "b1" });
    const dbMock = {
      userBid: {
        findUnique: vi.fn().mockResolvedValue({ userId: "u1" }),
        delete: del,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.remove({ id: "b1" });

    expect(result).toEqual({ success: true });
    expect(del).toHaveBeenCalledWith({ where: { id: "b1" } });
  });

  it("throws FORBIDDEN and does not delete when the bid belongs to another user", async () => {
    const del = vi.fn();
    const dbMock = {
      userBid: {
        findUnique: vi.fn().mockResolvedValue({ userId: "someone-else" }),
        delete: del,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.remove({ id: "b1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(del).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN when the bid does not exist", async () => {
    const dbMock = {
      userBid: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.remove({ id: "missing" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
