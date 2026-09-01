import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { myBidPlanTool } from "./bid-plan";

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
    userBids: { listMine: procs.listMine, getBudget: procs.getBudget },
    acadTerms: { current: procs.acadTermsGetCurrent },
  } as unknown as ToolContext["caller"];
}

// listMine real shape: flat enrichment (see src/server/api/userBids/listMine/index.ts)
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

describe("my-bid-plan", () => {
  it("calls listMine and getBudget and returns filtered bids with notes stripped", async () => {
    const listMine = vi.fn().mockResolvedValue([
      mkBid({ id: "b1", bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 } }),
      mkBid({ id: "b2", bidWindow: { acadTermId: "AY2026/27-T2", round: "1", window: 1 } }),
    ]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 987.5 });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ listMine, getBudget }) };

    const result = await myBidPlanTool.run(ctx, { acadTermId: "AY2026/27-T1" });

    expect(listMine).toHaveBeenCalled();
    expect(getBudget).toHaveBeenCalledWith({ acadTermId: "AY2026/27-T1" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as {
      acadTermId: string;
      budget: unknown;
      bids: Array<Record<string, unknown>>;
    };
    expect(parsed.acadTermId).toBe("AY2026/27-T1");
    expect(parsed.budget).toEqual({ balance: 987.5 });
    expect(parsed.bids).toHaveLength(1);
    expect(parsed.bids[0]!.id).toBe("b1");
    // notes must not leak
    expect(parsed.bids[0]!.notes).toBeUndefined();
  });

  it("normalizes each bid to the flat BidPlanEntry shape", async () => {
    const listMine = vi.fn().mockResolvedValue([
      mkBid({
        id: "b1",
        bidAmount: 25,
        status: "PLANNED",
        bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 },
        courseCode: "ACC101",
        courseName: "Financial Accounting",
        section: "G1",
        professorName: "Prof X",
      }),
      mkBid({
        id: "b2",
        bidAmount: 51,
        status: "SECURED",
        bidWindow: { acadTermId: "AY2026/27-T1", round: "1A", window: 2 },
        courseCode: "FIN201",
        courseName: "Finance",
        section: "G3",
        professorName: null,
      }),
    ]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ listMine, getBudget }) };

    const result = await myBidPlanTool.run(ctx, { acadTermId: "AY2026/27-T1" });
    const parsed = JSON.parse(result.content[0]!.text) as {
      bids: Array<Record<string, unknown>>;
    };
    expect(parsed.bids).toHaveLength(2);
    // first entry — all flat fields
    expect(parsed.bids[0]).toMatchObject({
      id: "b1",
      bidAmount: 25,
      status: "PLANNED",
      courseCode: "ACC101",
      courseName: "Financial Accounting",
      section: "G1",
      professorName: "Prof X",
      round: "1",
      window: 1,
    });
    // null professor
    expect(parsed.bids[1]!.professorName).toBeNull();
    expect(parsed.bids[1]!.round).toBe("1A");
    expect(parsed.bids[1]!.window).toBe(2);
  });

  it("returns budget null when getBudget resolves null", async () => {
    const listMine = vi.fn().mockResolvedValue([]);
    const getBudget = vi.fn().mockResolvedValue(null);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ listMine, getBudget }) };

    const result = await myBidPlanTool.run(ctx, { acadTermId: "AY2026/27-T1" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as {
      budget: unknown;
      bids: unknown[];
    };
    expect(parsed.budget).toBeNull();
    expect(parsed.bids).toHaveLength(0);
  });

  it("returns errText when listMine rejects", async () => {
    const listMine = vi.fn().mockRejectedValue(new Error("boom"));
    const getBudget = vi.fn().mockResolvedValue({ balance: 10 });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ listMine, getBudget }) };

    const result = await myBidPlanTool.run(ctx, { acadTermId: "AY2026/27-T1" });
    expect(result.isError).toBe(true);
  });

  it("defaults acadTermId to the current term when omitted", async () => {
    const listMine = vi.fn().mockResolvedValue([
      mkBid({ id: "b1", bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 } }),
      mkBid({ id: "b2", bidWindow: { acadTermId: "AY2026/27-T2", round: "1", window: 1 } }),
    ]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 200 });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        listMine,
        getBudget,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "AY2026/27-T1" }),
      }),
    };

    const result = await myBidPlanTool.run(ctx, {});
    expect(result.isError).toBeUndefined();
    expect(getBudget).toHaveBeenCalledWith({ acadTermId: "AY2026/27-T1" });
    const parsed = JSON.parse(result.content[0]!.text) as {
      acadTermId: string;
      bids: Array<Record<string, unknown>>;
    };
    expect(parsed.acadTermId).toBe("AY2026/27-T1");
    expect(parsed.bids).toHaveLength(1);
    expect(parsed.bids[0]!.id).toBe("b1");
  });

  it("returns a friendly error when acadTermId is omitted and there is no current term", async () => {
    const listMine = vi.fn().mockResolvedValue([]);
    const getBudget = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        listMine,
        getBudget,
        acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
      }),
    };

    const result = await myBidPlanTool.run(ctx, {});
    expect(result.isError).toBe(true);
    expect(getBudget).not.toHaveBeenCalled();
  });
});
