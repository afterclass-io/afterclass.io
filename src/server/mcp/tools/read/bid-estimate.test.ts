import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { bidEstimateTool } from "./bid-estimate";

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

function mkCaller(opts: {
  openWindow?: unknown;
  course?: unknown;
  classes?: unknown[];
  prediction?: unknown;
  bidResults?: unknown[];
  safetyFactors?: unknown[];
  currentWindowForBidWindow?: unknown;
  windowsByTerm?: unknown;
}) {
  const now = new Date();
  // resolveOpenWindowIdOrError reads caller.bidWindows.getCurrentWindow and checks active window.
  // Provide an active window by default unless openWindow explicitly set.
  const openWindow =
    opts.openWindow !== undefined
      ? opts.openWindow
      : {
          id: 77,
          acadTermId: "AY2026/27-T1",
          round: "1",
          window: 1,
          opensAt: new Date(now.getTime() - 60_000),
          resultsAt: new Date(now.getTime() + 60_000),
        };
  return {
    bidWindows: {
      getCurrentWindow: vi.fn().mockResolvedValue(openWindow),
      getByAcadTerm: vi.fn().mockResolvedValue(opts.windowsByTerm ?? []),
    },
    courses: {
      getByCourseCode: vi.fn().mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- keep ternary: null means \"not found\" vs fallback; ?? would collapse incorrectly for explicit undefined
        opts.course !== undefined ? opts.course : { id: "cs1", code: "COR-IS1702", name: "Computational Thinking" },
      ),
    },
    classes: {
      getAll: vi.fn().mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- keep ternary: null/[] semantics differ
        opts.classes !== undefined ? opts.classes : [{ id: "cl-g1", section: "G1", professor: { name: "Prof A", slug: "prof-a" } }],
      ),
    },
    bidPredictions: {
      getBy: vi.fn().mockResolvedValue(
        opts.prediction !== undefined
          ? opts.prediction
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- keep ternary: ?? would break null case (null ?? fallback != null ? null : fallback)
          : { medianPredicted: 25, minPredicted: 18, bidWindow: { id: 77, acadTermId: "AY2026/27-T1", round: "1", window: 1 } },
      ),
    },
    bidResults: {
      getBy: vi.fn().mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- keep ternary: null is a meaningful test value
        opts.bidResults !== undefined ? opts.bidResults : [{ bidWindowId: 77, vacancy: 12, bidWindow: { id: 77 } }],
      ),
    },
    safetyFactors: {
      getAll: vi.fn().mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- keep ternary: [] and null differ in semantics
        opts.safetyFactors !== undefined
          ? opts.safetyFactors
          : [{ acadTermId: "AY2026/27-T1", predictionType: "MEDIAN", beatsPercentage: 70, multiplier: 1.05 }],
      ),
    },
  } as unknown as ToolContext["caller"];
}

describe("bid-estimate", () => {
  it("is read-only and returns per-section estimates with suggested = median x multiplier and vacancy", async () => {
    const caller = mkCaller({
      classes: [
        { id: "cl-g1", section: "G1", professor: { name: "Prof A", slug: "prof-a" } },
        { id: "cl-g2", section: "G2", professor: { name: "Prof B", slug: "prof-b" } },
      ],
      prediction: { medianPredicted: 25, minPredicted: 18, bidWindow: { id: 77, acadTermId: "AY2026/27-T1", round: "1", window: 1 } },
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702" });
    expect(bidEstimateTool.readOnly).toBe(true);
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse(res.content[0]!.text) as {
      courseCode: string;
      courseName: string;
      bidWindow: { id: number };
      estimates: Array<{
        section: string;
        medianPredicted: number;
        minPredicted: number;
        suggestedBidAmount: number;
        multiplierUsed: number;
        vacancy: number;
      }>;
    };
    expect(parsed.courseCode).toBe("COR-IS1702");
    expect(parsed.bidWindow.id).toBe(77);
    expect(parsed.estimates).toHaveLength(2);
    // 25 x 1.05 = 26.25
    expect(parsed.estimates[0]!.suggestedBidAmount).toBe(26.25);
    expect(parsed.estimates[0]!.multiplierUsed).toBe(1.05);
    expect((caller.classes.getAll as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((caller.bidPredictions.getBy as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
  });

  it("filters to a single section when section is given", async () => {
    const caller = mkCaller({
      classes: [
        { id: "cl-g1", section: "G1", professor: { name: "Prof A", slug: "prof-a" } },
        { id: "cl-g2", section: "G2", professor: { name: "Prof B", slug: "prof-b" } },
      ],
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702", section: "G1" });
    const parsed = JSON.parse(res.content[0]!.text) as { estimates: Array<{ section: string }> };
    expect(parsed.estimates.map((e) => e.section)).toEqual(["G1"]);
  });

  it("returns errText when the course is not found", async () => {
    const caller = mkCaller({ course: null });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "FAKE9999" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain("not found");
  });

  it("falls back to the upcoming window as latest-overall with a warning when no window is open and no term is given", async () => {
    const now = new Date();
    const caller = mkCaller({
      openWindow: {
        id: 88,
        acadTermId: "t1",
        round: "1",
        window: 1,
        opensAt: new Date(now.getTime() + 60_000),
        resultsAt: new Date(now.getTime() + 120_000),
      },
      windowsByTerm: [],
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702" });
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse(res.content[0]!.text) as { bidWindow: { id: number }; warning: string };
    expect(parsed.bidWindow.id).toBe(88);
    expect(parsed.warning).toMatch(/prior-window results/);
  });

  it("returns errText when no window exists at all", async () => {
    const caller = mkCaller({ openWindow: null, windowsByTerm: [] });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toMatch(/bid window/i);
  });

  it("falls back to the latest window with a warning when no window is open", async () => {
    const now = new Date();
    const latest = {
      id: 99,
      acadTermId: "AY2026/27-T1",
      round: "2A",
      window: 3,
      opensAt: new Date(now.getTime() - 120_000),
      resultsAt: new Date(now.getTime() - 60_000),
    };
    const caller = mkCaller({
      openWindow: {
        id: 88,
        acadTermId: "AY2026/27-T1",
        round: "1",
        window: 1,
        opensAt: new Date(now.getTime() + 60_000),
        resultsAt: new Date(now.getTime() + 120_000),
      },
      windowsByTerm: [latest],
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702", acadTermId: "AY2026/27-T1" });
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse(res.content[0]!.text) as { bidWindow: { id: number }; warning: string };
    expect(parsed.bidWindow.id).toBe(99);
    expect(parsed.warning).toMatch(/prior-window results/);
    expect(parsed.warning).toMatch(/immediate-next-window only/);
  });

  it("returns short guidance when the term has no windows yet (future term)", async () => {
    const caller = mkCaller({ openWindow: null, windowsByTerm: [] });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702", acadTermId: "AY2099/00-T9" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toMatch(/no bid windows/i);
  });

  it("resolves an explicit r2aw3 alias to the matching window", async () => {
    const now = new Date();
    const target = {
      id: 99,
      acadTermId: "AY2026/27-T1",
      round: "2A",
      window: 3,
      opensAt: new Date(now.getTime() - 120_000),
      resultsAt: new Date(now.getTime() - 60_000),
    };
    const caller = mkCaller({
      openWindow: null,
      windowsByTerm: [
        { id: 77, acadTermId: "AY2026/27-T1", round: "1", window: 1 },
        target,
      ],
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, {
      courseCode: "COR-IS1702",
      acadTermId: "AY2026/27-T1",
      bidWindow: "r2aw3",
    });
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse(res.content[0]!.text) as { bidWindow: { id: number }; warning?: string };
    expect(parsed.bidWindow.id).toBe(99);
    expect(parsed.warning).toBeUndefined();
  });

  it("defaults multiplier to 1.0 when no safety factor matches (suggested = median)", async () => {
    const caller = mkCaller({
      safetyFactors: [],
      prediction: { medianPredicted: 25, minPredicted: 18, bidWindow: { id: 77, acadTermId: "AY2026/27-T1", round: "1", window: 1 } },
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702" });
    const parsed = JSON.parse(res.content[0]!.text) as { estimates: Array<{ suggestedBidAmount: number; multiplierUsed: unknown }> };
    expect(parsed.estimates[0]!.suggestedBidAmount).toBe(25);
    expect(parsed.estimates[0]!.multiplierUsed).toBeNull();
  });

  it("handles missing predictions per section (median/min null, suggested null)", async () => {
    const caller = mkCaller({
      prediction: null,
      safetyFactors: [],
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702" });
    const parsed = JSON.parse(res.content[0]!.text) as {
      estimates: Array<{ medianPredicted: unknown; minPredicted: unknown; suggestedBidAmount: unknown; vacancy: unknown }>;
    };
    expect(parsed.estimates[0]!.medianPredicted).toBeNull();
  });

  it("returns a self-contained shape even when no classes exist for the course in the current term", async () => {
    const caller = mkCaller({ classes: [] });
    // Make the fallback (term-agnostic) also empty by having classes.getAll return [] on second call.
    // In mkCaller getAll is a single mock returned value, so we override it to be fn with second call.
    const getAll = caller.classes.getAll as unknown as ReturnType<typeof vi.fn>;
    getAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702" });
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse(res.content[0]!.text) as { estimates: unknown[]; note: string };
    expect(parsed.estimates).toEqual([]);
    expect(parsed.note).toContain("No sections found");
  });

  it("returns errText when the prediction procedure rejects (wrapped)", async () => {
    const caller = {
      bidWindows: {
        getCurrentWindow: vi.fn().mockResolvedValue({
          id: 77,
          acadTermId: "AY2026/27-T1",
          round: "1",
          window: 1,
          opensAt: new Date(Date.now() - 60_000),
          resultsAt: new Date(Date.now() + 60_000),
        }),
      },
      courses: { getByCourseCode: vi.fn().mockRejectedValue(new Error("db down")) },
      classes: { getAll: vi.fn() },
      bidPredictions: { getBy: vi.fn() },
      bidResults: { getBy: vi.fn() },
      safetyFactors: { getAll: vi.fn() },
    } as unknown as ToolContext["caller"];
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await bidEstimateTool.run(ctx, { courseCode: "COR-IS1702" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain("db down");
  });
});
