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

function makeCaller(procs: Record<string, unknown>) {
  return {
    userBids: {
      upsert: procs.userBidsUpsert,
      remove: procs.userBidsRemove,
      upsertBudget: procs.userBidsUpsertBudget,
      listMine: procs.userBidsListMine,
      getBudget: procs.userBidsGetBudget,
    },
    acadTerms: { current: procs.acadTermsGetCurrent },
    bidWindows: { getCurrentWindow: procs.bidWindowsGetCurrentWindow },
  } as unknown as ToolContext["caller"];
}

function mkBid(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    classId: "cl1",
    bidWindowId: 53,
    bidAmount: 25,
    notes: "private strategy",
    status: "PLANNED",
    createdAt: new Date().toISOString(),
    bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 },
    courseCode: "ACC101",
    courseName: "Financial Accounting",
    section: "G1",
    professorName: "Prof X",
    bidResult: null,
    ...overrides,
  };
}

describe("bid write tools", () => {
  function defaultPlanMocks(acadTermId = "AY2026/27-T1") {
    return {
      listMine: vi.fn().mockResolvedValue([mkBid({ bidWindow: { acadTermId, round: "1", window: 1 } })]),
      getBudget: vi.fn().mockResolvedValue({ balance: 100 }),
    };
  }

  it("upsert-bid calls userBids.upsert with classId/bidWindowId/bidAmount", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1", classId: "cl1", bidWindowId: 53, bidAmount: 25.5 });
    const { listMine, getBudget } = defaultPlanMocks();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsUpsert: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
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

  it("remove-bid calls userBids.remove with the bid id and returns { updated, plan }", async () => {
    const fn = vi.fn().mockResolvedValue({ success: true, acadTermId: "AY2026/27-T1" });
    const { listMine, getBudget } = defaultPlanMocks();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsRemove: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
    const result = await removeBidTool.run(ctx, { id: "b1" });
    expect(fn).toHaveBeenCalledWith({ id: "b1" });
    const parsed = JSON.parse(result.content[0]!.text) as { updated: { success: boolean }; plan: unknown };
    expect(parsed.updated.success).toBe(true);
    expect(parsed.plan).toBeDefined();
  });

  it("remove-bid returns errText when userBids.remove rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsRemove: fn }) };
    const result = await removeBidTool.run(ctx, { id: "b1" });
    expect(result.isError).toBe(true);
  });

  it("set-bid-budget calls userBids.upsertBudget and returns { updated, plan }", async () => {
    const fn = vi.fn().mockResolvedValue({ balance: 1000 });
    const { listMine, getBudget } = defaultPlanMocks("t1");
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsUpsertBudget: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
    const result = await setBidBudgetTool.run(ctx, { acadTermId: "t1", balance: 1000 });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", balance: 1000 });
    const parsed = JSON.parse(result.content[0]!.text) as { updated: { balance: number }; plan: { acadTermId: string } };
    expect(parsed.updated.balance).toBe(1000);
    expect(parsed.plan.acadTermId).toBe("t1");
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

  it("upsert-bid returns { updated, plan } with notes stripped", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1", classId: "cl1", bidWindowId: 53 });
    const listMine = vi.fn().mockResolvedValue([
      mkBid({ id: "b1", classId: "cl1", bidWindowId: 53, bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 } }),
    ]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsUpsert: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
    const result = await upsertBidTool.run(ctx, { classId: "cl1", bidWindowId: 53, bidAmount: 25 });
    const parsed = JSON.parse(result.content[0]!.text) as { plan: { bids: Array<Record<string, unknown>> } };
    expect(parsed.plan.bids[0]!.notes).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-unsafe-member-access -- typed envelope
  });

  it("remove-bid returns { updated, plan } with notes stripped", async () => {
    const fn = vi.fn().mockResolvedValue({ success: true, acadTermId: "AY2026/27-T1" });
    const getMine = vi.fn().mockResolvedValue([mkBid({ id: "b1", bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 } })]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 50 });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsRemove: fn, userBidsListMine: getMine, userBidsGetBudget: getBudget }),
    };
    const result = await removeBidTool.run(ctx, { id: "b1" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as { plan: { bids: Array<Record<string, unknown>> } };
    expect(parsed.plan.bids[0]!.notes).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-unsafe-member-access -- typed envelope
  });

  it("bid write tools expose bid-plan widgetName + toWidgetProps unwrapping plan", () => {
    expect(upsertBidTool.widgetName).toBe("bid-plan");
    expect(removeBidTool.widgetName).toBe("bid-plan");
    expect(setBidBudgetTool.widgetName).toBe("bid-plan");
    expect(upsertBidTool.toWidgetProps).toBeDefined();
    expect(removeBidTool.toWidgetProps).toBeDefined();
    expect(setBidBudgetTool.toWidgetProps).toBeDefined();
  });

  it("bid write tool toWidgetProps unwraps { updated, plan } to plan props", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1", classId: "cl1", bidWindowId: 53 });
    const listMine = vi.fn().mockResolvedValue([mkBid({ id: "b1", classId: "cl1", bidWindowId: 53 })]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsUpsert: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
    const result = await upsertBidTool.run(ctx, { classId: "cl1", bidWindowId: 53, bidAmount: 25 });
    const props = upsertBidTool.toWidgetProps!(result);
    expect(props.acadTermId).toBeDefined();
  });
});
