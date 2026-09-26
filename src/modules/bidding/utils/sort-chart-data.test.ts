import { describe, expect, it } from "vitest";
import { sortChartData } from "./sort-chart-data";

describe("sortChartData", () => {
  it("normalises the price tuple form into min/median/price", () => {
    expect(
      sortChartData([
        { bidWindow: "AY202627T1/1A/2", price: [10, 20], size: 3 },
      ]),
    ).toEqual([
      {
        bidWindow: "AY202627T1/1A/2",
        price: [10, 20],
        min: 10,
        median: 20,
        size: 3,
      },
    ]);
  });

  it("normalises the min/median form into the same shape", () => {
    const [row] = sortChartData([
      { bidWindow: "AY202627T1/1A/2", min: 5, median: 9, size: 1 },
    ]);
    expect(row).toEqual({
      bidWindow: "AY202627T1/1A/2",
      price: [5, 9],
      min: 5,
      median: 9,
      size: 1,
    });
  });

  it("sorts by academic term, then round order, then window number", () => {
    const sorted = sortChartData([
      { bidWindow: "AY202627T2/2A/1", price: [1, 1], size: 1 },
      { bidWindow: "AY202526T1/1B/1", price: [1, 1], size: 1 },
      { bidWindow: "AY202627T1/1A/2", price: [1, 1], size: 1 },
      { bidWindow: "AY202627T1/1A/1", price: [1, 1], size: 1 },
    ]);
    expect(sorted.map((d) => d.bidWindow)).toEqual([
      "AY202526T1/1B/1",
      "AY202627T1/1A/1",
      "AY202627T1/1A/2",
      "AY202627T2/2A/1",
    ]);
  });

  it("applies BOSS round order rather than alphabetical order", () => {
    const sorted = sortChartData([
      { bidWindow: "AY202627T1/1F/1", price: [1, 1], size: 1 },
      { bidWindow: "AY202627T1/1/1", price: [1, 1], size: 1 },
      { bidWindow: "AY202627T1/2/1", price: [1, 1], size: 1 },
      { bidWindow: "AY202627T1/1A/1", price: [1, 1], size: 1 },
    ]);
    expect(sorted.map((d) => d.bidWindow)).toEqual([
      "AY202627T1/1/1",
      "AY202627T1/1A/1",
      "AY202627T1/1F/1",
      "AY202627T1/2/1",
    ]);
  });

  it("does not mutate its input array", () => {
    const input = [
      {
        bidWindow: "AY202627T1/2/1",
        price: [1, 1] as [number, number],
        size: 1,
      },
      {
        bidWindow: "AY202627T1/1/1",
        price: [1, 1] as [number, number],
        size: 1,
      },
    ];
    sortChartData(input);
    expect(input.map((d) => d.bidWindow)).toEqual([
      "AY202627T1/2/1",
      "AY202627T1/1/1",
    ]);
  });
});
