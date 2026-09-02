import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { setBidStatusTool } from "./bid-status";

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
      setStatus: procs.userBidsSetStatus,
      listMine: procs.userBidsListMine,
      getBudget: procs.userBidsGetBudget,
    },
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
    ...overrides,
  };
}

describe("bid-status write tool", () => {
  it("set-bid-status calls userBids.setStatus with the bid id and status", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1", status: "SECURED", classId: "cl1", acadTermId: "AY2026/27-T1" });
    const listMine = vi.fn().mockResolvedValue([mkBid({ id: "b1" })]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsSetStatus: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
    await setBidStatusTool.run(ctx, { id: "b1", status: "SECURED" });
    expect(fn).toHaveBeenCalledWith({ id: "b1", status: "SECURED" });
  });

  it("set-bid-status returns errText when userBids.setStatus rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsSetStatus: fn }),
    };
    const result = await setBidStatusTool.run(ctx, { id: "b1", status: "DROPPED" });
    expect(result.isError).toBe(true);
  });

  it("accepts every status value from the UserBidStatus enum", () => {
    for (const status of [
      "PLANNED",
      "SECURED",
      "DROPPED",
      "CANCELLED",
      "PARTICIPATED",
    ]) {
      const parsed = setBidStatusTool.inputSchema.safeParse({ id: "b1", status });
      expect(parsed.success).toBe(true);
    }
  });

  it("forwards PARTICIPATED to the procedure (5-value union)", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1", status: "PARTICIPATED", classId: "cl1", acadTermId: "AY2026/27-T1" });
    const listMine = vi.fn().mockResolvedValue([mkBid({ id: "b1" })]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsSetStatus: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
    await setBidStatusTool.run(ctx, { id: "b1", status: "PARTICIPATED" });
    expect(fn).toHaveBeenCalledWith({ id: "b1", status: "PARTICIPATED" });
  });

  it("rejects an unknown status value", () => {
    const parsed = setBidStatusTool.inputSchema.safeParse({
      id: "b1",
      status: "WITHDRAWN",
    });
    expect(parsed.success).toBe(false);
  });

  it("set-bid-status returns { updated, plan } with notes stripped", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1", status: "SECURED", classId: "cl1", acadTermId: "AY2026/27-T1" });
    const listMine = vi.fn().mockResolvedValue([mkBid({ id: "b1" })]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsSetStatus: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
    const result = await setBidStatusTool.run(ctx, { id: "b1", status: "SECURED" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as { plan: { bids: Array<Record<string, unknown>> } };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- typed envelope
    expect(parsed.plan.bids[0]!.notes).toBeUndefined();
  });

  it("set-bid-status exposes bid-plan widgetName + toWidgetProps that unwraps plan", async () => {
    expect(setBidStatusTool.widgetName).toBe("bid-plan");
    expect(setBidStatusTool.toWidgetProps).toBeDefined();
    const fn = vi.fn().mockResolvedValue({ id: "b1", status: "SECURED", classId: "cl1", acadTermId: "AY2026/27-T1" });
    const listMine = vi.fn().mockResolvedValue([mkBid({ id: "b1" })]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsSetStatus: fn, userBidsListMine: listMine, userBidsGetBudget: getBudget }),
    };
    const result = await setBidStatusTool.run(ctx, { id: "b1", status: "SECURED" });
    const props = setBidStatusTool.toWidgetProps!(result);
    expect(props.acadTermId).toBeDefined();
  });
});
