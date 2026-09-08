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
    bidWindow: { acadTermId: "AY202627T1", round: "1", window: 1 },
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
    acadTermId: "AY202627T1",
    round: "1",
    window: 1,
    opensAt: new Date(now.getTime() - 60_000),
    resultsAt: new Date(now.getTime() + 60_000),
  };
}

describe("save-bids", () => {
  it("is not read-only and exposes bid-plan toViewProps", () => {
    expect(saveBidsTool.readOnly).not.toBe(true);
    expect(saveBidsTool.toViewProps).toBeDefined();
  });

  it("bulk saves two bids, resolving classIds and returning { updated, plan } with notes stripped", async () => {
    const upsert = vi
      .fn()
      .mockResolvedValue({ id: "b1", classId: "cl-g1", bidWindowId: 77 });
    const getAll = vi
      .fn()
      .mockImplementation(
        async ({
          courseCode,
          section,
        }: {
          courseCode: string;
          section: string;
        }) => {
          if (courseCode === "COR-IS1702" && section === "G1")
            return [{ id: "cl-g1", section: "G1" }];
          if (courseCode === "ACCT102" && section === "G2")
            return [{ id: "cl-g2", section: "G2" }];
          return [];
        },
      );
    const listMine = vi.fn().mockResolvedValue([
      mkBid({
        classId: "cl-g1",
        bidWindowId: 77,
        bidWindow: { acadTermId: "AY202627T1", round: "1", window: 1 },
      }),
      mkBid({
        classId: "cl-g2",
        bidWindowId: 77,
        bidWindow: { acadTermId: "AY202627T1", round: "1", window: 1 },
        section: "G2",
        courseCode: "ACCT102",
      }),
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
    expect(upsert).toHaveBeenNthCalledWith(1, {
      classId: "cl-g1",
      bidWindowId: 77,
      bidAmount: 25,
      notes: undefined,
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      classId: "cl-g2",
      bidWindowId: 77,
      bidAmount: 30,
      notes: undefined,
    });
    const parsed = JSON.parse(res.content[0]!.text) as {
      updated: Array<{ ok: boolean; courseCode: string; section: string }>;
      plan: { acadTermId: string; bids: Array<Record<string, unknown>> };
    };
    expect(parsed.updated).toHaveLength(2);
    expect(parsed.updated[0]!.ok).toBe(true);
    expect(parsed.plan.acadTermId).toBe("AY202627T1");
    expect(parsed.plan.bids[0]!.notes).toBeUndefined();
  });

  it("save-bids per-entry results carry no notes key", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "b1",
      classId: "cl-g1",
      bidWindowId: 77,
      notes: "secret plan",
    });
    const getAll = vi.fn().mockResolvedValue([{ id: "cl-g1", section: "G1" }]);
    const listMine = vi
      .fn()
      .mockResolvedValue([mkBid({ classId: "cl-g1", bidWindowId: 77 })]);
    const getBudget = vi.fn().mockResolvedValue({ balance: 100 });
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: getAll,
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: listMine,
      userBidsGetBudget: getBudget,
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const out = await saveBidsTool.run(ctx, {
      bids: [
        {
          courseCode: "COR-IS1702",
          section: "G1",
          bidAmount: 25,
          notes: "secret plan",
        },
      ],
    });
    const text = out.content.find((c) => c.type === "text")?.text ?? "";
    expect(text).not.toContain('"notes"');
  });

  it("fetches the current window and listMine exactly once per call (N+1 collapse)", async () => {
    // Per-entry bidWindowId overrides targeting a non-current window: the loop
    // still runs 3 resolves + 3 upserts, but run()'s own getCurrentWindow +
    // listMine stay at 1 each. (Overrides are deliberate: a default-window
    // success batch additionally triggers ONE plan-time listMine inside the
    // shared buildBidPlan — constant, not per-entry — so it is excluded here
    // to isolate run()'s hoisted fetches.)
    const getAll = vi
      .fn()
      .mockImplementation(
        async ({ section }: { section: string }) => [
          { id: `cl-${section}`, section },
        ],
      );
    const listMine = vi.fn().mockResolvedValue([
      mkBid({
        classId: "cl-G1",
        bidWindowId: 77,
        bidWindow: { acadTermId: "AY202627T1", round: "1", window: 1 },
      }),
    ]);
    const getCurrentWindow = vi.fn().mockResolvedValue(openWindow());
    const upsert = vi
      .fn()
      .mockImplementation(
        async ({
          classId,
          bidWindowId,
        }: {
          classId: string;
          bidWindowId: number;
        }) => ({
          id: `b-${classId}`,
          classId,
          bidWindowId,
        }),
      );
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: getAll,
      bidWindowsGetCurrentWindow: getCurrentWindow,
      userBidsListMine: listMine,
      userBidsGetBudget: vi.fn().mockResolvedValue({ balance: 100 }),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [
        { courseCode: "COR-IS1702", section: "G1", bidAmount: 25, bidWindowId: 99 },
        { courseCode: "COR-IS1702", section: "G2", bidAmount: 30, bidWindowId: 99 },
        { courseCode: "COR-IS1702", section: "G3", bidAmount: 35, bidWindowId: 99 },
      ],
    });
    expect(res.isError).toBeUndefined();
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(getCurrentWindow).toHaveBeenCalledTimes(1);
    expect(listMine).toHaveBeenCalledTimes(1);
  });

  it("learns the plan term from the current window for first-time bidders (empty pre-loop listMine)", async () => {
    const getCurrentWindow = vi.fn().mockResolvedValue(openWindow());
    const listMine = vi.fn().mockResolvedValue([]);
    const caller = makeCaller({
      userBidsUpsert: vi
        .fn()
        .mockResolvedValue({ id: "b-new", classId: "cl-G1", bidWindowId: 77 }),
      classesGetAll: vi
        .fn()
        .mockResolvedValue([{ id: "cl-G1", section: "G1" }]),
      bidWindowsGetCurrentWindow: getCurrentWindow,
      userBidsListMine: listMine,
      userBidsGetBudget: vi.fn().mockResolvedValue({ balance: 100 }),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [{ courseCode: "COR-IS1702", section: "G1", bidAmount: 25 }],
    });
    const parsed = JSON.parse(res.content[0]!.text) as {
      updated: Array<{ ok: boolean }>;
      plan: { acadTermId: string } | null;
    };
    expect(parsed.updated[0]!.ok).toBe(true);
    expect(parsed.plan?.acadTermId).toBe("AY202627T1");
  });

  it("supports per-entry bidWindowId override", async () => {
    const upsert = vi
      .fn()
      .mockResolvedValue({ id: "b1", classId: "cl1", bidWindowId: 99 });
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: vi.fn().mockResolvedValue([{ id: "cl1", section: "G1" }]),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: vi.fn().mockResolvedValue([]),
      userBidsGetBudget: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [
        {
          courseCode: "COR-IS1702",
          section: "G1",
          bidAmount: 25,
          bidWindowId: 99,
        },
      ],
    });
    expect(upsert).toHaveBeenCalledWith({
      classId: "cl1",
      bidWindowId: 99,
      bidAmount: 25,
      notes: undefined,
    });
    expect(res.isError).toBeUndefined();
  });

  it("reports partial failure per row without aborting other rows", async () => {
    const upsert = vi
      .fn()
      .mockImplementation(async ({ classId }: { classId: string }) => {
        if (classId === "cl-g1")
          return { id: "b1", classId: "cl-g1", bidWindowId: 77 };
        throw new Error("upsert failed for g2");
      });
    const getAll = vi
      .fn()
      .mockImplementation(async ({ section }: { section: string }) => {
        if (section === "G1") return [{ id: "cl-g1", section: "G1" }];
        if (section === "G2") return [{ id: "cl-g2", section: "G2" }];
        return [];
      });
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: getAll,
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: vi
        .fn()
        .mockResolvedValue([mkBid({ classId: "cl-g1", bidWindowId: 77 })]),
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
    expect((parsed.updated[1] as { error: string }).error).toContain(
      "upsert failed",
    );
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
    const parsed = JSON.parse(res.content[0]!.text) as {
      updated: Array<{ ok: boolean; error: string }>;
    };
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
    const parsed = JSON.parse(res.content[0]!.text) as {
      updated: Array<{ ok: boolean; error: string }>;
    };
    expect(parsed.updated[0]!.ok).toBe(false);
    expect(parsed.updated[0]!.error).toContain("not found");
  });

  it("validates input: bids array must be non-empty", () => {
    const parsed = saveBidsTool.inputSchema.safeParse({ bids: [] });
    expect(parsed.success).toBe(false);
  });

  it("toViewProps unwraps plan from { updated, plan } envelope", async () => {
    const upsert = vi
      .fn()
      .mockResolvedValue({ id: "b1", classId: "cl-g1", bidWindowId: 77 });
    const getAll = vi.fn().mockResolvedValue([{ id: "cl-g1", section: "G1" }]);
    const listMine = vi
      .fn()
      .mockResolvedValue([mkBid({ classId: "cl-g1", bidWindowId: 77 })]);
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
    const props = saveBidsTool.toViewProps!(res);
    expect(props.acadTermId).toBe("AY202627T1");
  });

  it("passes a sub-floor bidAmount through unclamped (the e$10 floor is suggestion-only)", async () => {
    const upsert = vi
      .fn()
      .mockResolvedValue({ id: "b1", classId: "cl-g1", bidWindowId: 77 });
    const caller = makeCaller({
      userBidsUpsert: upsert,
      classesGetAll: vi
        .fn()
        .mockResolvedValue([{ id: "cl-g1", section: "G1" }]),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(openWindow()),
      userBidsListMine: vi
        .fn()
        .mockResolvedValue([
          mkBid({ classId: "cl-g1", bidWindowId: 77, bidAmount: 5 }),
        ]),
      userBidsGetBudget: vi.fn().mockResolvedValue({ balance: 100 }),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await saveBidsTool.run(ctx, {
      bids: [{ courseCode: "COR-IS1702", section: "G1", bidAmount: 5 }],
    });
    expect(res.isError).toBeUndefined();
    // Server does NOT clamp inputs: the raw amount reaches the procedure.
    expect(upsert).toHaveBeenCalledWith({
      classId: "cl-g1",
      bidWindowId: 77,
      bidAmount: 5,
      notes: undefined,
    });
    const parsed = JSON.parse(res.content[0]!.text) as {
      updated: Array<{ ok: boolean }>;
      plan: { bids: Array<{ bidAmount: number }> };
    };
    expect(parsed.updated[0]!.ok).toBe(true);
    expect(parsed.plan.bids[0]!.bidAmount).toBe(5);
  });
});
