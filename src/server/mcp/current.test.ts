import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "./types";
import {
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
    bidWindows: { getCurrentWindow: procs.bidWindowsGetCurrentWindow },
  } as unknown as ToolContext["caller"];
}

const now = new Date("2026-09-01T08:00:00.000Z");
const hour = 60 * 60 * 1000;

// A current-term-like object (AcadTermSummary) returned by acadTerms.getCurrent.
const term = { id: "AY2026/27-T1", label: "AY2026/27 T1", startDt: new Date(), endDt: new Date() };

// A bid-window-like object (BidWindow & { acadTerm }) returned by
// bidWindows.getCurrentWindow. `opensAt`/`resultsAt` are what the open-window
// resolver verifies; `id` is the value it returns.
function mkWindow(overrides: { id?: number; opensAt: Date; resultsAt: Date } = {
  id: 7,
  opensAt: new Date(now.getTime() - 24 * hour),
  resultsAt: new Date(now.getTime() + 24 * hour),
}) {
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
    const ctx = makeCaller({ acadTermsGetCurrent: vi.fn().mockResolvedValue(term) });
    const res = await resolveTermIdOrError(ctx);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe("AY2026/27-T1");
  });

  it("returns a friendly error when there is no current term", async () => {
    const ctx = makeCaller({ acadTermsGetCurrent: vi.fn().mockResolvedValue(null) });
    const res = await resolveTermIdOrError(ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errText).toMatch(/current academic term/i);
  });

  it("returns an error (not a throw) when getCurrent rejects", async () => {
    const ctx = makeCaller({ acadTermsGetCurrent: vi.fn().mockRejectedValue(new Error("boom")) });
    const res = await resolveTermIdOrError(ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errText).toMatch(/boom/);
  });
});

describe("resolveOpenWindowIdOrError", () => {
  it("returns the id of the window that is currently open (opensAt <= now < resultsAt)", async () => {
    const win = mkWindow();
    const ctx = makeCaller({ bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(win) });
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
    const ctx = makeCaller({ bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(upcoming) });
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
    const ctx = makeCaller({ bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(past) });
    const res = await resolveOpenWindowIdOrError(ctx, now);
    expect(res.ok).toBe(false);
  });

  it("returns a friendly error when no window exists at all", async () => {
    const ctx = makeCaller({ bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(null) });
    const res = await resolveOpenWindowIdOrError(ctx, now);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errText).toMatch(/bid window/i);
  });

  it("rejects a window with null dates (not active)", async () => {
    const undated = mkWindow({ id: 10, opensAt: null as unknown as Date, resultsAt: null as unknown as Date });
    const ctx = makeCaller({ bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(undated) });
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
    if (res.ok) expect(res.value).toEqual({ acadTermId: "AY2026/27-T1", bidWindowId: 7 });
  });

  it("returns bidWindowId null when no window is open (window is optional, term is not)", async () => {
    const ctx = makeCaller({
      acadTermsGetCurrent: vi.fn().mockResolvedValue(term),
      bidWindowsGetCurrentWindow: vi.fn().mockResolvedValue(null),
    });
    const res = await resolveCurrentContext(ctx, now);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toEqual({ acadTermId: "AY2026/27-T1", bidWindowId: null });
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
