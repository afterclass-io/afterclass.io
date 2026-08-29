import { describe, it, expect } from "vitest";
import { summarizeBidsByRound, compareRound } from "./budget-math";
import type { BidSummary } from "./budget-math";

// ---------------------------------------------------------------------------
// summarizeBidsByRound
// ---------------------------------------------------------------------------

describe("summarizeBidsByRound", () => {
  // ---- Empty bids ----
  it("returns all-zero summary for empty bids", () => {
    const result = summarizeBidsByRound([], 100);
    expect(result.roundTotals).toEqual([]);
    expect(result.grandTotal).toBe(0);
    expect(result.balance).toBe(100);
    expect(result.overshoot).toBe(0);
    expect(result.overshootByRound).toEqual([]);
  });

  // ---- Single bid ----
  it("returns correct round total for a single bid", () => {
    const bids: BidSummary[] = [{ amount: 50, round: "1", window: 1 }];
    const result = summarizeBidsByRound(bids, 100);

    expect(result.roundTotals).toHaveLength(1);
    expect(result.roundTotals[0]!.round).toBe("1");
    expect(result.roundTotals[0]!.total).toBe(50);
    expect(result.roundTotals[0]!.windows).toEqual([{ window: 1, amount: 50 }]);
    expect(result.grandTotal).toBe(50);
    expect(result.overshoot).toBe(0);
    expect(result.overshootByRound).toEqual([{ round: "1", overshoot: 0 }]);
  });

  // ---- Multiple bids same round ----
  it("sums multiple bids in the same round correctly", () => {
    const bids: BidSummary[] = [
      { amount: 20, round: "1", window: 1 },
      { amount: 30, round: "1", window: 1 },
      { amount: 15, round: "1", window: 2 },
    ];
    const result = summarizeBidsByRound(bids, 100);

    expect(result.roundTotals).toHaveLength(1);
    expect(result.roundTotals[0]!.round).toBe("1");
    expect(result.roundTotals[0]!.total).toBe(65);
    expect(result.roundTotals[0]!.windows).toEqual([
      { window: 1, amount: 50 },
      { window: 2, amount: 15 },
    ]);
    expect(result.grandTotal).toBe(65);
    expect(result.overshoot).toBe(0);
  });

  // ---- Multiple rounds ----
  it("computes per-round totals and cumulative overshoot for multiple rounds", () => {
    const bids: BidSummary[] = [
      { amount: 30, round: "1", window: 1 },
      { amount: 20, round: "1", window: 2 },
      { amount: 40, round: "1A", window: 1 },
      { amount: 30, round: "2", window: 1 },
    ];
    const result = summarizeBidsByRound(bids, 100);

    expect(result.roundTotals).toHaveLength(3);
    expect(result.roundTotals[0]!.round).toBe("1");
    expect(result.roundTotals[0]!.total).toBe(50);
    expect(result.roundTotals[1]!.round).toBe("1A");
    expect(result.roundTotals[1]!.total).toBe(40);
    expect(result.roundTotals[2]!.round).toBe("2");
    expect(result.roundTotals[2]!.total).toBe(30);

    expect(result.grandTotal).toBe(120);
    expect(result.overshoot).toBe(20);

    // Cumulative overshoot:
    // After round 1:  50 - 100 = 0
    // After round 1A: 90 - 100 = 0
    // After round 2:  120 - 100 = 20
    expect(result.overshootByRound).toEqual([
      { round: "1", overshoot: 0 },
      { round: "1A", overshoot: 0 },
      { round: "2", overshoot: 20 },
    ]);
  });

  // ---- Balance > total → overshoot 0 ----
  it("reports zero overshoot when balance exceeds grand total", () => {
    const bids: BidSummary[] = [{ amount: 10, round: "1", window: 1 }];
    const result = summarizeBidsByRound(bids, 500);

    expect(result.overshoot).toBe(0);
    expect(result.overshootByRound).toEqual([{ round: "1", overshoot: 0 }]);
  });

  // ---- Total > balance ----
  it("reports correct overshoot when total exceeds balance", () => {
    const bids: BidSummary[] = [
      { amount: 80, round: "1", window: 1 },
      { amount: 50, round: "2", window: 1 },
    ];
    const result = summarizeBidsByRound(bids, 100);

    expect(result.grandTotal).toBe(130);
    expect(result.overshoot).toBe(30);
    expect(result.overshootByRound).toEqual([
      { round: "1", overshoot: 0 },
      { round: "2", overshoot: 30 },
    ]);
  });

  // ---- Round ordering: canonical BOSS order ----
  it("orders rounds in canonical BOSS order (1, 1A, 1B, 1C, 1F, 2, 2A, 3)", () => {
    const bids: BidSummary[] = [
      { amount: 1, round: "3", window: 1 },
      { amount: 1, round: "1C", window: 1 },
      { amount: 1, round: "2A", window: 1 },
      { amount: 1, round: "1F", window: 1 },
      { amount: 1, round: "1B", window: 1 },
      { amount: 1, round: "1A", window: 1 },
      { amount: 1, round: "2", window: 1 },
      { amount: 1, round: "1", window: 1 },
    ];
    const result = summarizeBidsByRound(bids, 100);

    const roundOrder = result.roundTotals.map((r) => r.round);
    expect(roundOrder).toEqual(["1", "1A", "1B", "1C", "1F", "2", "2A", "3"]);
  });

  // ---- Round ordering: unknown numeric rounds sort lexicographically ----
  // compareRounds puts known rounds (1, 1A, …, 2A) first in canonical order,
  // then unknown rounds lexicographically. "1" and "2" happen to be known
  // rounds; truly unknown numeric rounds like "3", "10", "99" sort as strings
  // (so "10" < "3" < "99"). BOSS data never has unknown rounds — this test
  // only pins the documented contract.
  it("sorts unknown numeric rounds lexicographically after known rounds", () => {
    const bids: BidSummary[] = [
      { amount: 1, round: "99", window: 1 },
      { amount: 1, round: "3", window: 1 },
      { amount: 1, round: "10", window: 1 },
    ];
    const result = summarizeBidsByRound(bids, 100);

    const roundOrder = result.roundTotals.map((r) => r.round);
    // All three are unknown → sorted alphabetically: "10" < "3" < "99"
    expect(roundOrder).toEqual(["10", "3", "99"]);
  });

  // ---- Balance of 0 ----
  it("handles zero balance correctly (everything overshoots)", () => {
    const bids: BidSummary[] = [{ amount: 10, round: "1", window: 1 }];
    const result = summarizeBidsByRound(bids, 0);

    expect(result.overshoot).toBe(10);
    expect(result.overshootByRound).toEqual([{ round: "1", overshoot: 10 }]);
  });

  // ---- Negative amounts (edge case) ----
  it("handles negative bid amounts (debit-style)", () => {
    const bids: BidSummary[] = [
      { amount: -10, round: "1", window: 1 },
      { amount: 50, round: "1", window: 2 },
    ];
    const result = summarizeBidsByRound(bids, 100);

    expect(result.roundTotals[0]!.total).toBe(40);
    expect(result.grandTotal).toBe(40);
    expect(result.overshoot).toBe(0);
  });

  // ---- Floating-point amounts ----
  it("handles floating-point bid amounts", () => {
    const bids: BidSummary[] = [
      { amount: 10.5, round: "1", window: 1 },
      { amount: 20.25, round: "1", window: 2 },
      { amount: 70.25, round: "2", window: 1 },
    ];
    const result = summarizeBidsByRound(bids, 100);

    expect(result.grandTotal).toBeCloseTo(101, 5);
    expect(result.overshoot).toBeCloseTo(1, 5);
    // Cumulative: after round 1 → 30.75, no overshoot; after round 2 → 101, overshoot ≈ 1
    expect(result.overshootByRound[0]!.overshoot).toBe(0);
    expect(result.overshootByRound[1]!.overshoot).toBeCloseTo(1, 5);
  });

  // ---- Large number of windows in a round ----
  it("groups multiple windows within the same round and sorts by window number", () => {
    const bids: BidSummary[] = [
      { amount: 5, round: "1", window: 3 },
      { amount: 10, round: "1", window: 1 },
      { amount: 15, round: "1", window: 2 },
    ];
    const result = summarizeBidsByRound(bids, 100);

    expect(result.roundTotals[0]!.windows).toEqual([
      { window: 1, amount: 10 },
      { window: 2, amount: 15 },
      { window: 3, amount: 5 },
    ]);
    expect(result.roundTotals[0]!.total).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// compareRound — canonical BOSS round ordering convergence
// ---------------------------------------------------------------------------

describe("compareRound", () => {
  it("matches the canonical BOSS round order (1, 1A, 1B, 1C, 1F, 2, 2A)", () => {
    const rounds = ["2A", "1", "1C", "1F", "1B", "2", "1A"];
    const sorted = [...rounds].toSorted(compareRound);
    expect(sorted).toEqual(["1", "1A", "1B", "1C", "1F", "2", "2A"]);
  });

  it("sorts unknown rounds alphabetically after all known rounds", () => {
    const rounds = ["3", "1", "2B", "2A", "99", "Z", "1A"];
    const sorted = [...rounds].toSorted(compareRound);
    // Known rounds first in order, then unknown alphabetically
    expect(sorted).toEqual(["1", "1A", "2A", "2B", "3", "99", "Z"]);
  });

  it("returns zero for identical rounds", () => {
    expect(compareRound("1", "1")).toBe(0);
    expect(compareRound("1A", "1A")).toBe(0);
    expect(compareRound("unknown", "unknown")).toBe(0);
  });

  it("sorts 1 before 1A (numeric-only before letter-suffixed)", () => {
    expect(compareRound("1", "1A")).toBeLessThan(0);
    expect(compareRound("1A", "1")).toBeGreaterThan(0);
  });
});
