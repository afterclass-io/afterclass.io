import { describe, expect, it } from "vitest";

import { summarizeSessionBids } from "./bids-summary";

describe("summarizeSessionBids", () => {
  it("returns zeros for no bids and no budget", () => {
    expect(summarizeSessionBids([], 0)).toEqual({
      plannedCount: 0,
      securedCount: 0,
      amountSpent: 0,
      remaining: 0,
    });
  });

  it("counts planned bids across the whole term, all rounds/windows", () => {
    const bids = [
      { bidAmount: 50, status: "PLANNED" },
      { bidAmount: 30, status: "PLANNED" },
      { bidAmount: 20, status: "PLANNED" },
    ];
    expect(summarizeSessionBids(bids, 100).plannedCount).toBe(3);
  });

  it("sums secured bids as spent", () => {
    const bids = [
      { bidAmount: 50, status: "SECURED" },
      { bidAmount: 30, status: "SECURED" },
    ];
    const s = summarizeSessionBids(bids, 100);
    expect(s.securedCount).toBe(2);
    expect(s.amountSpent).toBe(80);
  });

  it("excludes DROPPED and CANCELLED bids from every figure", () => {
    const bids = [
      { bidAmount: 50, status: "SECURED" },
      { bidAmount: 40, status: "DROPPED" },
      { bidAmount: 30, status: "CANCELLED" },
      { bidAmount: 20, status: "MISSED" },
      { bidAmount: 10, status: "PLANNED" },
    ];
    const s = summarizeSessionBids(bids, 100);
    expect(s.plannedCount).toBe(1);
    expect(s.securedCount).toBe(1);
    expect(s.amountSpent).toBe(50);
    expect(s.remaining).toBe(50);
  });

  it("computes remaining as balance minus spent", () => {
    const bids = [{ bidAmount: 40, status: "SECURED" }];
    expect(summarizeSessionBids(bids, 100).remaining).toBe(60);
  });

  it("can go negative when secured bids exceed the budget", () => {
    const bids = [{ bidAmount: 80, status: "SECURED" }];
    expect(summarizeSessionBids(bids, 50).remaining).toBe(-30);
  });
});
