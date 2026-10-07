import { describe, expect, it } from "vitest";

import { assignLanes } from "./overlay-lanes";

describe("assignLanes", () => {
  it("keeps a lone block full width", () => {
    expect(assignLanes([{ startSlot: 2, length: 4 }])).toEqual([
      { lane: 0, laneCount: 1 },
    ]);
  });

  it("splits blocks that overlap in time", () => {
    expect(
      assignLanes([
        { startSlot: 1, length: 12 },
        { startSlot: 1, length: 12 },
      ]),
    ).toEqual([
      { lane: 0, laneCount: 2 },
      { lane: 1, laneCount: 2 },
    ]);
  });

  it("does not narrow blocks that merely follow each other", () => {
    expect(
      assignLanes([
        { startSlot: 0, length: 4 },
        { startSlot: 4, length: 4 },
      ]),
    ).toEqual([
      { lane: 0, laneCount: 1 },
      { lane: 0, laneCount: 1 },
    ]);
  });

  it("reuses a freed lane inside one cluster", () => {
    const result = assignLanes([
      { startSlot: 0, length: 10 },
      { startSlot: 2, length: 2 },
      { startSlot: 5, length: 2 },
    ]);
    expect(result.map((p) => p.laneCount)).toEqual([2, 2, 2]);
    expect(result.map((p) => p.lane)).toEqual([0, 1, 1]);
  });
});
