import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { saveBidsTool } from "./save-bids";

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

function mkBid(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    classId: "cl1",
    bidWindowId: 77,
    bidAmount: 25,
    notes: "private strategy",
    status: "PLANNED",
    createdAt: new Date().toISOString(),
    bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 },
    courseCode: "COR-IS1702",
    courseName: "Computational Thinking",
    section: "G1",
    professorName: "Prof A",
    bidResult: null,
    ...overrides,
  };
}

function makeCaller(procs: Record<string, unknown>) {
  return {
    userBids: {
      upsert: procs.userBidsUpsert,
      listMine: procs.userBidsListMine,
      getBudget: procs.userBidsGetBudget,
    },
    bidWindows: { getCurrentWindow: procs.bidWindowsGetCurrentWindow },
    classes: { getAll: procs.classesGetAll },
  } as unknown as ToolContext["caller"];
}

function openWindow() {
  const now = new Date();
  return {
    id: 77,
    acadTermId: "AY2026/27-T1",
    round: "1",
    window: 1,
    opensAt: new Date(now.getTime() - 60_000),
    resultsAt: new Date(now.getTime() + 60_000),
  };
}

describe("save-bids", () => {
  it("is not read-only and exposes bid-plan toWidgetProps", () => {
    expect(saveBidsTool.readOnly).not.toBe(true);
    expect(saveBidsTool.toWidgetProps).toBeDefined();
  });

  it("bulk saves two bids, resolving classIds and returning { updated, plan } with notes stripped", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "b1", classId: "cl-g1", bidWindowId: 77 });
    const getAll = vi.fn().mockImplementation(async ({ courseCode, section }: { courseCode: string; section: string }) => {
      if (courseCode === "COR-IS1702" && section === "G1") return [{ id: "cl-g1", section: "G1" }];
      if (courseCode === "ACCT102" && section === "G2") return [{ id: "cl-g2", section: "G2" }];
      return [];
    });
    const listMine = vi.fn().mockResolvedValue([
      mkBid({ classId: "cl-g1", bidWindowId: 77, bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 } }),
      mkBid({ classId: "cl-g2", bidWindowId: 77, bidWindow: { acadTermId: "AY2026/27-T1", round: "1", window: 1 }, section: "G2", courseCode: "ACCT102" }),
    ]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: getAll,
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: listMine,
      userBidsGetBudget: getBudget,
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [
        { courseCode: "COR-IS1702", section: "G1", bidAmount: 25 },
        { courseCode: "ACCT102", section: "G2", bidAmount: 30 },
      ],
    });
    expect(res.isError).toBeUndefined();
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, { classId: "cl-g1", bidWindowId: 77, bidAmount: 25, notes: undefined });
    expect(upsert).toHaveBeenNthCalledWith(2, { classId: "cl-g2", bidWindowId: 77, bidAmount: 30, notes: undefined });
    const parsed = JSON.parse(res.content[0]!.text) as {
      updated: Array<{ ok: boolean; courseCode: string; section: string }>;
      plan: { acadTermId: string; bids: Array<Record<string, unknown>> };
    };
    expect(parsed.updated).toHaveLength(2);
    expect(parsed.updated[0]!.ok).toBe(true);
    expect(parsed.plan.acadTermId).toBe("AY2026/27-T1");
    expect(parsed.plan.bids[0]!.notes).toBeUndefined();
  });

  it("supports per-entry bidWindowId override", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "b1", classId: "cl1", bidWindowId: 99 });
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: vi.fn().mockResolvedValue([{ id: "cl1", section: "G1" }]),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: vi.fn().mockResolvedValue([]),
      userBidsGetBudget: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [{ courseCode: "COR-IS1702", section: "G1", bidAmount: 25, bidWindowId: 99 }],
    });
    expect(upsert).toHaveBeenCalledWith({ classId: "cl1", bidWindowId: 99, bidAmount: 25, notes: undefined });
    expect(res.isError).toBeUndefined();
  });

  it("reports partial failure per row without aborting other rows", async () => {
    const upsert = vi.fn().mockImplementation(async ({ classId }: { classId: string }) => {
      if (classId === "cl-g1") return { id: "b1", classId: "cl-g1", bidWindowId: 77 };
      throw new Error("upsert failed for g2");
    });
    const getAll = vi.fn().mockImplementation(async ({ section }: { section: string }) => {
      if (section === "G1") return [{ id: "cl-g1", section: "G1" }];
      if (section === "G2") return [{ id: "cl-g2", section: "G2" }];
      return [];
    });
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: getAll,
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: vi.fn().mockResolvedValue([
        mkBid({ classId: "cl-g1", bidWindowId: 77 }),
      ]),
      userBidsGetBudget: vi.fn().mockResolvedValue({ balance: 50 }),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [
        { courseCode: "COR-IS1702", section: "G1", bidAmount: 25 },
        { courseCode: "COR-IS1702", section: "G2", bidAmount: 30 },
      ],
    });
    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0]!.text) as {
      updated: Array<{ ok: boolean; error?: string }>;
      plan: unknown;
    };
    expect(parsed.updated).toHaveLength(2);
    expect(parsed.updated[0]!.ok).toBe(true);
    expect(parsed.updated[1]!.ok).toBe(false);
    expect((parsed.updated[1] as { error: string }).error).toContain("upsert failed");
    expect(parsed.plan).not.toBeNull();
  });

  it("fails per-entry with 'ask the user for round + window' when no window is open and no id given", async () => {
    const now = new Date();
    const closed = {
      id: 88,
      acadTermId: "t1",
      opensAt: new Date(now.getTime() + 60_000),
      resultsAt: new Date(now.getTime() + 120_000),
    };
    const upsert = vi.fn();
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: vi.fn().mockResolvedValue([{ id: "cl1", section: "G1" }]),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(closed),
      userBidsListMine: vi.fn().mockResolvedValue([]),
      userBidsGetBudget: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [{ courseCode: "COR-IS1702", section: "G1", bidAmount: 25 }],
    });
    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0]!.text) as { updated: Array<{ ok: boolean; error: string }> };
    expect(parsed.updated[0]!.ok).toBe(false);
    expect(parsed.updated[0]!.error).toMatch(/ask the user/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("fails per-entry with 'not found' when class resolution returns nothing", async () => {
    const caller = makeCaller({
      userBidsUpsert: vi.fn(),
      classesGetAll: vi.fn().mockResolvedValue([]),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: vi.fn().mockResolvedValue([]),
      userBidsGetBudget: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [{ courseCode: "UNKNOWN", section: "G1", bidAmount: 25 }],
    });
    const parsed = JSON.parse(res.content[0]!.text) as { updated: Array<{ ok: boolean; error: string }> };
    expect(parsed.updated[0]!.ok).toBe(false);
    expect(parsed.updated[0]!.error).toContain("not found");
  });

  it("validates input: bids array must be non-empty", () => {
    const parsed = saveBidsTool.inputSchema.safeParse({ bids: [] });
    expect(parsed.success).toBe(false);
  });

  it("toWidgetProps unwraps plan from { updated, plan } envelope", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "b1", classId: "cl-g1", bidWindowId: 77 });
    const getAll = vi.fn().mockResolvedValue([{ id: "cl-g1", section: "G1" }]);
    const listMine = vi.fn().mockResolvedValue([mkBid({ classId: "cl-g1", bidWindowId: 77 })]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: getAll,
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: listMine,
      userBidsGetBudget: getBudget,
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [{ courseCode: "COR-IS1702", section: "G1", bidAmount: 25 }],
    });
    const props = saveBidsTool.toWidgetProps!(res);
    expect(props.acadTermId).toBe("AY2026/27-T1");
  });
});
