import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import {
  browsePublicRoadmapsTool,
  getSharedTimetableTool,
  myBidsTool,
  myBudgetTool,
  myRoadmapsTool,
  myTimetablesTool,
} from "./mydata";

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

// Each tool calls a procedure on a specific sub-router (e.g. caller.timetable.listMine),
// so place each mock under the router namespace the tool actually uses. Every sub-router
// gets a DISTINCT key so a tool calling the wrong router cannot accidentally hit a mock
// that happens to be present under the same property name elsewhere.
function makeCaller(procs: Record<string, unknown>) {
  return {
    timetable: { listMine: procs.timetableListMine },
    userBids: { listMine: procs.userBidsListMine, getBudget: procs.getBudget },
    roadmaps: { listMine: procs.roadmapsListMine, listPublic: procs.listPublic },
    sharing: { getSharedTimetable: procs.getSharedTimetable },
    acadTerms: { current: procs.acadTermsGetCurrent },
  } as unknown as ToolContext["caller"];
}

describe("my-data read tools", () => {
  it("my-timetables calls timetable.listMine with the user's acadTermId", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableListMine: fn }) };
    await myTimetablesTool.run(ctx, { acadTermId: "t1" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1" });
  });

  it("my-timetables strips shareToken and icalToken bearer tokens from the output", async () => {
    const fn = vi.fn().mockResolvedValue([
      { id: "tt1", name: "A", shareToken: "tok", icalToken: "ical", visibility: "UNLISTED" },
    ]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableListMine: fn }) };
    const result = await myTimetablesTool.run(ctx, { acadTermId: "t1" });
    const parsed = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(parsed[0]!.shareToken).toBeUndefined();
    expect(parsed[0]!.icalToken).toBeUndefined();
    expect(parsed[0]!.id).toBe("tt1");
  });

  it("my-timetables returns errText when timetable.listMine rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableListMine: fn }) };
    const result = await myTimetablesTool.run(ctx, { acadTermId: "t1" });
    expect(result.isError).toBe(true);
  });

  it("my-timetables defaults acadTermId to the current term when omitted", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        timetableListMine: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    await myTimetablesTool.run(ctx, {});
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1" });
  });

  it("my-timetables treats an empty-string acadTermId as omitted (defaults to current term)", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        timetableListMine: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    await myTimetablesTool.run(ctx, { acadTermId: "" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1" });
  });

  it("my-bids calls userBids.listMine()", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsListMine: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    await myBidsTool.run(ctx, myBidsTool.inputSchema.parse({}));
    expect(fn).toHaveBeenCalledWith();
  });

  it("my-bids strips free-text notes (PII) from the output", async () => {
    const fn = vi.fn().mockResolvedValue([
      {
        id: "b1",
        classId: "cl1",
        bidWindowId: 53,
        bidAmount: 25.5,
        notes: "private bidding strategy",
        status: "PLANNED",
        createdAt: new Date().toISOString(),
        bidWindow: { id: 53, round: 1, acadTermId: "t1" },
        courseCode: "ACC101",
        courseName: "Financial Accounting",
        section: "G1",
        professorName: "Prof X",
        bidResult: null,
      },
    ]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsListMine: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    const result = await myBidsTool.run(ctx, myBidsTool.inputSchema.parse({}));
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.notes).toBeUndefined();
    // Non-PII metadata survives the scrub.
    expect(parsed[0]!.bidAmount).toBe(25.5);
    expect(parsed[0]!.courseCode).toBe("ACC101");
  });

  it("my-bids returns errText when userBids.listMine rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsListMine: fn }) };
    const result = await myBidsTool.run(ctx, myBidsTool.inputSchema.parse({}));
    expect(result.isError).toBe(true);
  });

  it("my-bids filters by acadTermId when provided", async () => {
    const fn = vi.fn().mockResolvedValue([
      { id: "b1", bidAmount: 25, status: "PLANNED", bidWindow: { acadTermId: "t1" }, courseCode: "ACC101" },
      { id: "b2", bidAmount: 30, status: "SECURED", bidWindow: { acadTermId: "t2" }, courseCode: "FIN201" },
    ]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsListMine: fn }) };
    const result = await myBidsTool.run(ctx, myBidsTool.inputSchema.parse({ acadTermId: "t1" }));
    const parsed = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.id).toBe("b1");
  });

  it("my-bids without acadTermId defaults to the current term (includes all windows in it)", async () => {
    const fn = vi.fn().mockResolvedValue([
      { id: "b1", bidWindow: { acadTermId: "t1", round: "1" } },
      { id: "b2", bidWindow: { acadTermId: "t1", round: "2" } },
      { id: "b3", bidWindow: { acadTermId: "t2" } },
    ]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsListMine: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    const result = await myBidsTool.run(ctx, myBidsTool.inputSchema.parse({}));
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    // Both windows within the current term are kept; the other term's bid is not.
    expect(parsed).toHaveLength(2);
    expect(parsed.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("my-bids returns a friendly error when acadTermId is omitted and there is no current term", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsListMine: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
      }),
    };
    const result = await myBidsTool.run(ctx, myBidsTool.inputSchema.parse({}));
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/current academic term/i);
  });

  it("my-bids defaults to limit 20 and clamps results", async () => {
    const makeBids = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `b${i}`,
        bidAmount: 10 + i,
        status: "PLANNED",
        bidWindow: { acadTermId: "t1" },
        courseCode: `C${i}`,
      }));
    // Omitted limit → default 20 (no acadTermId apart from auto-resolved t1)
    const fnDefault = vi.fn().mockResolvedValue(makeBids(30));
    const ctxDefault: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        userBidsListMine: fnDefault,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    const resultDefault = await myBidsTool.run(ctxDefault, myBidsTool.inputSchema.parse({}));
    const parsedDefault = JSON.parse(resultDefault.content[0]!.text) as unknown[];
    expect(parsedDefault).toHaveLength(20);

    // Explicit limit 5 with acadTermId
    const fn5 = vi.fn().mockResolvedValue(makeBids(30));
    const ctx5: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsListMine: fn5 }) };
    const result5 = await myBidsTool.run(ctx5, myBidsTool.inputSchema.parse({ acadTermId: "t1", limit: 5 }));
    const parsed5 = JSON.parse(result5.content[0]!.text) as unknown[];
    expect(parsed5).toHaveLength(5);
  });

  it("my-bids clamps after term filtering and widget-compatible shape is preserved", async () => {
    const fn = vi.fn().mockResolvedValue([
      ...Array.from({ length: 25 }, (_, i) => ({
        id: `b${i}`,
        bidAmount: 10 + i,
        status: "PLANNED",
        bidWindow: { acadTermId: "t1" },
        courseCode: `C${i}`,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `x${i}`,
        bidAmount: 99,
        status: "PLANNED",
        bidWindow: { acadTermId: "t2" },
        courseCode: `X${i}`,
      })),
    ]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ userBidsListMine: fn }) };
    // Filtered to t1 → 25 rows → clamped to 20 default (no explicit limit)
    const result = await myBidsTool.run(ctx, myBidsTool.inputSchema.parse({ acadTermId: "t1" }));
    const parsed = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(20);
    for (const b of parsed) {
      expect(b.notes).toBeUndefined();
      expect(b.bidAmount).toBeDefined();
      expect(b.courseCode).toBeDefined();
    }
  });

  it("my-bids rejects limit > 50 and limit 0", () => {
    expect(myBidsTool.inputSchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(myBidsTool.inputSchema.safeParse({ acadTermId: "t1", limit: 51 }).success).toBe(false);
    expect(myBidsTool.inputSchema.safeParse({ acadTermId: "t1", limit: 0 }).success).toBe(false);
    expect(myBidsTool.inputSchema.safeParse({ acadTermId: "t1", limit: 50 }).success).toBe(true);
    expect(myBidsTool.inputSchema.safeParse({ acadTermId: "t1", limit: 1 }).success).toBe(true);
    const parsedDefault = myBidsTool.inputSchema.safeParse({});
    expect(parsedDefault.success).toBe(true);
    if (parsedDefault.success) expect((parsedDefault.data as { limit: number }).limit).toBe(20);
  });

  it("my-bid-budget calls userBids.getBudget", async () => {
    const fn = vi.fn().mockResolvedValue(null);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getBudget: fn }) };
    await myBudgetTool.run(ctx, { acadTermId: "t1" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1" });
  });

  it("my-bid-budget returns errText when userBids.getBudget rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getBudget: fn }) };
    const result = await myBudgetTool.run(ctx, { acadTermId: "t1" });
    expect(result.isError).toBe(true);
  });

  it("my-bid-budget defaults acadTermId to the current term when omitted", async () => {
    const fn = vi.fn().mockResolvedValue(null);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getBudget: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    await myBudgetTool.run(ctx, {});
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1" });
  });

  it("my-bid-budget returns a friendly error when acadTermId is omitted and there is no current term", async () => {
    const fn = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getBudget: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
      }),
    };
    const result = await myBudgetTool.run(ctx, {});
    expect(result.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("my-roadmaps calls roadmaps.listMine()", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsListMine: fn }) };
    await myRoadmapsTool.run(ctx, {});
    expect(fn).toHaveBeenCalledWith();
  });

  it("my-roadmaps strips shareToken bearer token from the output", async () => {
    const fn = vi.fn().mockResolvedValue([{ id: "r1", name: "A", shareToken: "tok", visibility: "PRIVATE" }]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsListMine: fn }) };
    const result = await myRoadmapsTool.run(ctx, {});
    const parsed = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(parsed[0]!.shareToken).toBeUndefined();
    expect(parsed[0]!.id).toBe("r1");
  });

  it("my-roadmaps returns errText when roadmaps.listMine rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsListMine: fn }) };
    const result = await myRoadmapsTool.run(ctx, {});
    expect(result.isError).toBe(true);
  });

  it("browse-public-roadmaps calls roadmaps.listPublic with filters", async () => {
    const fn = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ listPublic: fn }) };
    await browsePublicRoadmapsTool.run(ctx, { query: "finance", limit: 10 });
    expect(fn).toHaveBeenCalledWith({ query: "finance", limit: 10 });
  });

  it("browse-public-roadmaps returns errText when roadmaps.listPublic rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ listPublic: fn }) };
    const result = await browsePublicRoadmapsTool.run(ctx, { query: "finance", limit: 10 });
    expect(result.isError).toBe(true);
  });

  it("get-shared-timetable calls sharing.getSharedTimetable with the token", async () => {
    const fn = vi.fn().mockResolvedValue({ timetable: {}, slots: [] });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getSharedTimetable: fn }) };
    await getSharedTimetableTool.run(ctx, { token: "tok123" });
    expect(fn).toHaveBeenCalledWith({ token: "tok123" });
  });

  it("get-shared-timetable returns errText when sharing.getSharedTimetable rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getSharedTimetable: fn }) };
    const result = await getSharedTimetableTool.run(ctx, { token: "tok123" });
    expect(result.isError).toBe(true);
  });
});
