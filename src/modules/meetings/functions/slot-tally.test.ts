import { describe, expect, it } from "vitest";

import { buildSlotTally, getSlotBreakdown, getSlotTally } from "./slot-tally";

const people = [
  { name: "Alice", availableSlots: [0, 1], ifNeededSlots: [2] },
  { name: "Ben", availableSlots: [1], ifNeededSlots: [0, 1] },
  { name: "Chloe", availableSlots: [], ifNeededSlots: [] },
];

describe("slot tally", () => {
  const tally = buildSlotTally(people);

  it("groups names by availability per slot", () => {
    expect(getSlotTally(tally, 0)).toEqual({
      available: ["Alice"],
      ifNeeded: ["Ben"],
    });
    expect(getSlotTally(tally, 1)).toEqual({
      available: ["Alice", "Ben"],
      ifNeeded: [],
    });
  });

  it("returns an empty tally for slots nobody marked", () => {
    expect(getSlotTally(tally, 99)).toEqual({ available: [], ifNeeded: [] });
  });

  it("lists everyone else as unavailable", () => {
    expect(getSlotBreakdown(tally, 2, people)).toEqual({
      available: [],
      ifNeeded: ["Alice"],
      unavailable: ["Ben", "Chloe"],
    });
  });
});
