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
    acadTerms: { current: procs.acadTermsGetCurrent },
    bidWindows: { getCurrentWindow: procs.bidWindowsGetCurrentWindow },
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

  it("upsert-bid defaults bidWindowId to the current OPEN window when omitted", async () => {
    const now = new Date();
    const fn = vi.fn().mockResolvedValue({ id: "b1" });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsUpsert: fn,
        bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue({
          id: 77,
          acadTermId: "t1",
          opensAt: new Date(now.getTime() - 60_000),
          resultsAt: new Date(now.getTime() + 60_000),
        }),
      }),
    };
    await upsertBidTool.run(ctx, { classId: "cl1", bidAmount: 25.5 });
    expect(fn).toHaveBeenCalledWith({ classId: "cl1", bidWindowId: 77, bidAmount: 25.5 });
  });

  it("upsert-bid returns a friendly 'ask the user for round + window' error when no window is open", async () => {
    const now = new Date();
    const fn = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsUpsert: fn,
        // getCurrentWindowLogic falls back to the upcoming window when nothing
        // is active - the resolver must reject it rather than bid in it.
        bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue({
          id: 88,
          acadTermId: "t1",
          opensAt: new Date(now.getTime() + 60_000),
          resultsAt: new Date(now.getTime() + 120_000),
        }),
      }),
    };
    const result = await upsertBidTool.run(ctx, { classId: "cl1", bidAmount: 25.5 });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/ask the user/i);
    expect(fn).not.toHaveBeenCalled();
  });

  it("upsert-bid returns a friendly error when no bid window exists at all", async () => {
    const fn = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsUpsert: fn,
        bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(null),
      }),
    };
    const result = await upsertBidTool.run(ctx, { classId: "cl1", bidAmount: 25.5 });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/bid window/i);
    expect(fn).not.toHaveBeenCalled();
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

  it("set-bid-budget defaults acadTermId to the current term when omitted", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsUpsertBudget: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    await setBidBudgetTool.run(ctx, { balance: 1000 });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", balance: 1000 });
  });

  it("set-bid-budget returns a friendly error when acadTermId is omitted and there is no current term", async () => {
    const fn = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsUpsertBudget: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
      }),
    };
    const result = await setBidBudgetTool.run(ctx, { balance: 1000 });
    expect(result.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
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
