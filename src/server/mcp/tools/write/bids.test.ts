import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { MAX_BUDGET, removeBidTool, setBidBudgetTool, upsertBidTool } from "./bids";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Each tool calls a procedure on the userBids sub-router (upsert/remove/upsertBudget),
// so place each mock under the router namespace the tool actually uses, with distinct key names.
function makeCaller(procs: Record<string, unknown>) {
  return {
    userBids: {
      upsert: procs.userBidsUpsert,
      remove: procs.userBidsRemove,
      upsertBudget: procs.userBidsUpsertBudget,
    },
  } as unknown as ToolContext["caller"];
}

describe("bid write tools", () => {
  it("upsert-bid calls userBids.upsert with classId/bidWindowId/bidAmount", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1" });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsUpsert: fn }) };
    await upsertBidTool.run(ctx, { classId: "cl1", bidWindowId: 53, bidAmount: 25.5, notes: "safety" });
    expect(fn).toHaveBeenCalledWith({ classId: "cl1", bidWindowId: 53, bidAmount: 25.5, notes: "safety" });
  });

  it("upsert-bid returns errText when userBids.upsert rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsUpsert: fn }) };
    const result = await upsertBidTool.run(ctx, { classId: "cl1", bidWindowId: 53, bidAmount: 25.5 });
    expect(result.isError).toBe(true);
  });

  it("remove-bid calls userBids.remove with the bid id", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsRemove: fn }) };
    await removeBidTool.run(ctx, { id: "b1" });
    expect(fn).toHaveBeenCalledWith({ id: "b1" });
  });

  it("remove-bid returns errText when userBids.remove rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsRemove: fn }) };
    const result = await removeBidTool.run(ctx, { id: "b1" });
    expect(result.isError).toBe(true);
  });

  it("set-bid-budget calls userBids.upsertBudget", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsUpsertBudget: fn }) };
    await setBidBudgetTool.run(ctx, { acadTermId: "t1", balance: 1000 });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", balance: 1000 });
  });

  it("set-bid-budget returns errText when userBids.upsertBudget rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsUpsertBudget: fn }) };
    const result = await setBidBudgetTool.run(ctx, { acadTermId: "t1", balance: 1000 });
    expect(result.isError).toBe(true);
  });

  it("set-bid-budget schema rejects a negative balance", () => {
    const parsed = setBidBudgetTool.inputSchema.safeParse({ acadTermId: "t1", balance: -1 });
    expect(parsed.success).toBe(false);
  });

  it("set-bid-budget rejects a balance above MAX_BUDGET without calling upsertBudget", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsUpsertBudget: fn }) };
    const result = await setBidBudgetTool.run(ctx, {
      acadTermId: "t1",
      balance: MAX_BUDGET + 1,
    });
    expect(result.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("set-bid-budget schema rejects a balance above MAX_BUDGET", () => {
    const parsed = setBidBudgetTool.inputSchema.safeParse({
      acadTermId: "t1",
      balance: MAX_BUDGET + 1,
    });
    expect(parsed.success).toBe(false);
  });
});
