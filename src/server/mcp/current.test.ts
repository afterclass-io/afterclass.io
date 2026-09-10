import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "./types";
import {
  normalizeAcadTermId,
  parseBidWindowAlias,
  pickActiveOrFirst,
  resolveClassIdByCodeSection,
  resolveLatestWindowIdOrError,
  resolveTermId,
  resolveTermIdOrError,
  resolveOpenWindowIdOrError,
  resolveCurrentContext,
} from "./current";

// The resolvers call two tRPC procedures: acadTerms.getCurrent (cached 24h)
// and bidWindows.getCurrentWindow (the 3-level active→upcoming→past fallback).
// Each mock goes under the router namespace the helper actually uses.
function makeCaller(procs: Record<string, unknown>) {
  return {
    acadTerms: { current: procs.acadTermsGetCurrent },
    bidWindows: {
      getCurrentWindow: procs.bidWindowsGetCurrentWindow,
      getByAcadTerm: procs.bidWindowsGetByAcadTerm,
    },
  } as unknown as ToolContext["caller"];
}

const now = new Date("2026-09-01T08:00:00.000Z");
const hour = 60 * 60 * 1000;

// A current-term-like object (AcadTermSummary) returned by acadTerms.getCurrent.
const term = {
  id: "AY2026/27-T1",
  label: "AY2026/27 T1",
  startDt: new Date(),
  endDt: new Date(),
};

// A bid-window-like object (BidWindow & { acadTerm }) returned by
// bidWindows.getCurrentWindow. `opensAt`/`resultsAt` are what the open-window
// resolver verifies; `id` is the value it returns.
function mkWindow(
  overrides: { id?: number; opensAt: Date; resultsAt: Date } = {
    id: 7,
    opensAt: new Date(now.getTime() - 24 * hour),
    resultsAt: new Date(now.getTime() + 24 * hour),
  },
) {
  return {
    id: overrides.id ?? 7,
    acadTermId: "AY2026/27-T1",
    round: "1",
    window: 1,
    opensAt: overrides.opensAt,
    closesAt: null,
    resultsAt: overrides.resultsAt,
    acadTerm: { id: "AY2026/27-T1" },
  };
}

describe("resolveTermIdOrError", () => {
  it("returns the current term id when a current term exists", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockResolvedValue(term),
    });
    const res = await resolveTermIdOrError(ctx);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe("AY2026/27-T1");
  });

  it("returns a friendly error when there is no current term", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
    });
    const res = await resolveTermIdOrError(ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errText).toMatch(/current academic term/i);
  });

  it("returns an error (not a throw) when getCurrent rejects", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const res = await resolveTermIdOrError(ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errText).toMatch(/boom/);
  });
});

describe("normalizeAcadTermId", () => {
  it.each([
    ["AY202627T1", "AY202627T1"],
    ["ay202627t1", "AY202627T1"],
    ["  AY202627T1  ", "AY202627T1"],
    ["AY202627T3A", "AY202627T3A"],
    ["ay202425t3b", "AY202425T3B"],
    ["AY2026/27-T1", "AY202627T1"],
    ["AY2024/25-T2", "AY202425T2"],
    ["ay2026/27-t3a", "AY202627T3A"],
    ["  AY2024/25-T3B  ", "AY202425T3B"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeAcadTermId(input)).toBe(expected);
  });

  it.each([["2026-1"], ["t1"], [""], ["   "], ["AY2026"], ["random term"]])(
    "passes %s through unchanged (fail-open)",
    (input) => {
      expect(normalizeAcadTermId(input)).toBe(input.trim());
    },
  );

  it("round-trips display input through resolveTermId to compact", async () => {
    const getCurrent = vi.fn();
    const ctx = makeCaller({ acadTermsGetCurrent: getCurrent });
    const res = await resolveTermId(ctx, "  AY2026/27-T2  ");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe("AY202627T2");
    expect(getCurrent).not.toHaveBeenCalled();
  });
});

describe("resolveTermId", () => {
  it("uses an explicit trimmed acadTermId without resolving the current term", async () => {
    const getCurrent = vi.fn();
    const ctx = makeCaller({ acadTermsGetCurrent: getCurrent });
    const res = await resolveTermId(ctx, "  AY202627T2  ");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe("AY202627T2");
    expect(getCurrent).not.toHaveBeenCalled();
  });

  it("defaults to the current term when acadTermId is omitted or empty", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockResolvedValue(term),
    });
    for (const input of [undefined, "", "   "]) {
      const res = await resolveTermId(ctx, input);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.value).toBe("AY2026/27-T1");
    }
  });

  it("returns the ask-user error when empty and there is no current term", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
    });
    const res = await resolveTermId(ctx, "");
    expect(res.ok).toBe(false);
    if (!res.ok)
      expect(res.errText).toMatch(/Ask the user which academic term/i);
  });
});

describe("resolveOpenWindowIdOrError", () => {
  it("returns the id of the window that is currently open (opensAt <= now < resultsAt)", async () => {
    const win = mkWindow();
    const ctx = makeCaller({
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(win),
    });
    const res = await resolveOpenWindowIdOrError(ctx, now);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe(7);
  });

  it("rejects an upcoming window even when getCurrentWindow falls back to it (fallback must NOT be used)", async () => {
    // getCurrentWindowLogic returns the soonest upcoming window when nothing
    // is active - the resolver must NOT silently bid in it.
    const upcoming = mkWindow({
      id: 8,
      opensAt: new Date(now.getTime() + 24 * hour),
      resultsAt: new Date(now.getTime() + 48 * hour),
    });
    const ctx = makeCaller({
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(upcoming),
    });
    const res = await resolveOpenWindowIdOrError(ctx, now);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errText).toMatch(/ask the user/i);
  });

  it("rejects a past window even when getCurrentWindow falls back to it", async () => {
    const past = mkWindow({
      id: 9,
      opensAt: new Date(now.getTime() - 48 * hour),
      resultsAt: new Date(now.getTime() - 24 * hour),
    });
    const ctx = makeCaller({
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(past),
    });
    const res = await resolveOpenWindowIdOrError(ctx, now);
    expect(res.ok).toBe(false);
  });

  it("returns a friendly error when no window exists at all", async () => {
    const ctx = makeCaller({
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(null),
    });
    const res = await resolveOpenWindowIdOrError(ctx, now);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errText).toMatch(/bid window/i);
  });

  it("rejects a window with null dates (not active)", async () => {
    const undated = mkWindow({
      id: 10,
      opensAt: null as unknown as Date,
      resultsAt: null as unknown as Date,
    });
    const ctx = makeCaller({
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(undated),
    });
    const res = await resolveOpenWindowIdOrError(ctx, now);
    expect(res.ok).toBe(false);
  });

  it("returns an error (not a throw) when getCurrentWindow rejects", async () => {
    const ctx = makeCaller({
      bidWindowsGetCurrentWindow: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const res = await resolveOpenWindowIdOrError(ctx, now);
    expect(res.ok).toBe(false);
  });
});

describe("resolveCurrentContext", () => {
  it("returns { acadTermId, bidWindowId } when both exist", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockResolvedValue(term),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(mkWindow()),
    });
    const res = await resolveCurrentContext(ctx, now);
    expect(res.ok).toBe(true);
    if (res.ok)
      expect(res.value).toEqual({ acadTermId: "AY2026/27-T1", bidWindowId: 7 });
  });

  it("returns bidWindowId null when no window is open (window is optional, term is not)", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockResolvedValue(term),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(null),
    });
    const res = await resolveCurrentContext(ctx, now);
    expect(res.ok).toBe(true);
    if (res.ok)
      expect(res.value).toEqual({
        acadTermId: "AY2026/27-T1",
        bidWindowId: null,
      });
  });

  it("returns an error when there is no current term", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(mkWindow()),
    });
    const res = await resolveCurrentContext(ctx, now);
    expect(res.ok).toBe(false);
  });
});

describe("parseBidWindowAlias", () => {
  it.each([
    ["r2aw3", { round: "2A", window: 3 }],
    ["R2W3", { round: "2", window: 3 }],
    ["round 2 window 3", { round: "2", window: 3 }],
    ["Round 2A Window 3", { round: "2A", window: 3 }],
    ["r1cw1", { round: "1C", window: 1 }],
  ])("parses %s", (input, expected) => {
    expect(parseBidWindowAlias(input)).toEqual(expected);
  });

  it("returns null for non-alias input", () => {
    expect(parseBidWindowAlias("hello")).toBeNull();
    expect(parseBidWindowAlias("")).toBeNull();
  });
});

describe("resolveLatestWindowIdOrError", () => {
  const w1 = { ...mkWindow(), id: 1, round: "1", window: 1 };
  const w2 = { ...mkWindow(), id: 2, round: "2A", window: 3 };

  it("returns the latest window for the term via getByAcadTerm", async () => {
    const ctx = makeCaller({
      bidWindowsGetByAcadTerm: vi.fn().mockResolvedValue([w1, w2]),
    });
    const res = await resolveLatestWindowIdOrError(ctx, "AY2026/27-T1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe(2);
  });

  it("falls back to the latest overall window when no term is given", async () => {
    const ctx = makeCaller({
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(w2),
    });
    const res = await resolveLatestWindowIdOrError(ctx);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe(2);
  });

  it("returns a friendly error when the term has no windows", async () => {
    const ctx = makeCaller({
      bidWindowsGetByAcadTerm: vi.fn().mockResolvedValue([]),
    });
    const res = await resolveLatestWindowIdOrError(ctx, "AY2099/00-T9");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errText).toMatch(/bid window/i);
  });
});

describe("pickActiveOrFirst", () => {
  it("prefers the active entry", () => {
    const list = [
      { id: "a", isActive: false },
      { id: "b", isActive: true },
    ];
    expect(pickActiveOrFirst(list)?.id).toBe("b");
  });

  it("falls back to the first entry when none is active", () => {
    const list = [
      { id: "a", isActive: false },
      { id: "b", isActive: false },
    ];
    expect(pickActiveOrFirst(list)?.id).toBe("a");
  });

  it("returns undefined for an empty list", () => {
    expect(pickActiveOrFirst([])).toBeUndefined();
  });
});

describe("resolveClassIdByCodeSection", () => {
  function classCaller(getAll: ReturnType<typeof vi.fn>) {
    return {
      classes: { getAll },
    } as unknown as ToolContext["caller"];
  }

  it("trims inputs and matches the exact section in the term", async () => {
    const getAll = vi.fn().mockResolvedValue([
      { id: "cl-g1", section: "G1" },
      { id: "cl-g2", section: "G2" },
    ]);
    const id = await resolveClassIdByCodeSection(classCaller(getAll), {
      courseCode: "  COR-IS1702 ",
      section: " G1 ",
      termId: "t1",
    });
    expect(id).toBe("cl-g1");
    expect(getAll).toHaveBeenCalledWith({
      courseCode: "COR-IS1702",
      section: "G1",
      acadTermId: "t1",
      limit: 5,
    });
  });

  it("falls back to a term-agnostic lookup when the term-scoped lookup is empty", async () => {
    const getAll = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "cl9", section: "G1" }]);
    const id = await resolveClassIdByCodeSection(classCaller(getAll), {
      courseCode: "COR-IS1702",
      section: "G1",
      termId: "t1",
    });
    expect(id).toBe("cl9");
    expect(getAll).toHaveBeenCalledTimes(2);
    expect(getAll.mock.calls[1]![0]).toMatchObject({
      courseCode: "COR-IS1702",
      section: "G1",
    });
    expect(getAll.mock.calls[1]![0]).not.toHaveProperty("acadTermId");
  });

  it("returns null when nothing matches (no fallback when unscoped is also empty)", async () => {
    const getAll = vi.fn().mockResolvedValue([]);
    const id = await resolveClassIdByCodeSection(classCaller(getAll), {
      courseCode: "COR-IS1702",
      section: "G9",
      termId: "t1",
    });
    expect(id).toBeNull();
    expect(getAll).toHaveBeenCalledTimes(2);
  });

  it("returns null for blank inputs without calling the procedure", async () => {
    const getAll = vi.fn();
    expect(
      await resolveClassIdByCodeSection(classCaller(getAll), {
        courseCode: "   ",
        section: "G1",
      }),
    ).toBeNull();
    expect(getAll).not.toHaveBeenCalled();
  });
});
