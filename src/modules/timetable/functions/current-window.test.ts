import { describe, expect, it } from "vitest";

import { pickCurrentBidWindow } from "./current-window";

const NOW = new Date("2026-07-31T14:00:00Z");

function bw(
  id: number,
  opensAt: string | null,
  closesAt: string | null,
): { id: number; opensAt: string | null; closesAt: string | null } {
  return { id, opensAt, closesAt };
}

describe("pickCurrentBidWindow", () => {
  it("returns null for an empty list", () => {
    expect(pickCurrentBidWindow([], NOW)).toBeNull();
  });

  it("picks the first window that has not closed yet (upcoming window)", () => {
    const windows = [
      bw(1, "2026-07-06T02:00:00Z", "2026-07-08T02:00:00Z"), // closed
      bw(2, "2026-07-13T09:00:00Z", "2026-07-15T02:00:00Z"), // closed
      bw(3, "2026-08-07T02:00:00Z", "2026-08-11T02:00:00Z"), // upcoming ←
      bw(4, "2026-08-17T02:00:00Z", "2026-08-19T02:00:00Z"), // later
    ];
    expect(pickCurrentBidWindow(windows, NOW)?.id).toBe(3);
  });

  it("picks a window that is currently open (closesAt in the future)", () => {
    const windows = [
      bw(1, "2026-07-28T02:00:00Z", "2026-08-02T02:00:00Z"), // still open ←
      bw(2, "2026-08-07T02:00:00Z", "2026-08-11T02:00:00Z"),
    ];
    expect(pickCurrentBidWindow(windows, NOW)?.id).toBe(1);
  });

  it("falls back to the latest window when all have closed", () => {
    const windows = [
      bw(1, "2026-07-06T02:00:00Z", "2026-07-08T02:00:00Z"),
      bw(2, "2026-07-13T09:00:00Z", "2026-07-15T02:00:00Z"),
      bw(3, "2026-07-20T09:00:00Z", "2026-07-22T02:00:00Z"),
    ];
    expect(pickCurrentBidWindow(windows, NOW)?.id).toBe(3);
  });

  it("sorts by opensAt before picking, regardless of input order", () => {
    const windows = [
      bw(3, "2026-08-07T02:00:00Z", "2026-08-11T02:00:00Z"),
      bw(1, "2026-07-06T02:00:00Z", "2026-07-08T02:00:00Z"),
      bw(2, "2026-07-13T09:00:00Z", "2026-07-15T02:00:00Z"),
    ];
    expect(pickCurrentBidWindow(windows, NOW)?.id).toBe(3);
  });

  it("ignores windows without dates for the open check and falls back to them last", () => {
    const windows = [
      bw(9, null, null),
      bw(1, "2026-07-06T02:00:00Z", "2026-07-08T02:00:00Z"),
    ];
    // window 1 closed; window 9 has no dates → latest dated window wins
    expect(pickCurrentBidWindow(windows, NOW)?.id).toBe(1);
  });

  it("accepts Date objects as well as ISO strings", () => {
    const windows = [
      {
        id: 1,
        opensAt: new Date("2026-08-07T02:00:00Z"),
        closesAt: new Date("2026-08-11T02:00:00Z"),
      },
    ];
    expect(pickCurrentBidWindow(windows, NOW)?.id).toBe(1);
  });

  it("does not mutate the input array", () => {
    const windows = [
      bw(2, "2026-08-07T02:00:00Z", "2026-08-11T02:00:00Z"),
      bw(1, "2026-07-06T02:00:00Z", "2026-07-08T02:00:00Z"),
    ];
    pickCurrentBidWindow(windows, NOW);
    expect(windows.map((w) => w.id)).toEqual([2, 1]);
  });
});
