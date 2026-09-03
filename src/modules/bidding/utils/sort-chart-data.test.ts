import { describe, it, expect } from "vitest";
import { sortChartData } from "./sort-chart-data";

describe("sortChartData", () => {
  it("sorts by acad term, then round order, then window, normalizing price into min/median", () => {
    const input: {
      bidWindow: string;
      price: [number, number];
      size: number;
    }[] = [
      { bidWindow: "AY202526T1/1/1", price: [100, 150], size: 1 },
      { bidWindow: "AY202627T1/1/1", price: [90, 140], size: 2 },
      { bidWindow: "AY202526T1/2/2", price: [80, 130], size: 3 },
      { bidWindow: "AY202526T1/1/2", price: [70, 120], size: 4 },
      { bidWindow: "AY202526T1/1A/1", price: [60, 110], size: 5 },
    ];

    const sorted = sortChartData(input);

    expect(sorted.map((d) => d.bidWindow)).toEqual([
      "AY202526T1/1/1",
      "AY202526T1/1/2",
      "AY202526T1/1A/1",
      "AY202526T1/2/2",
      "AY202627T1/1/1",
    ]);
    expect(sorted[0]).toEqual({
      bidWindow: "AY202526T1/1/1",
      price: [100, 150],
      min: 100,
      median: 150,
      size: 1,
    });
  });

  it("accepts min/median inputs and leaves them unchanged", () => {
    const sorted = sortChartData([
      { bidWindow: "AY202627T1/1/2", min: 50, median: 80, size: 3 },
    ]);
    expect(sorted[0]).toEqual({
      bidWindow: "AY202627T1/1/2",
      price: [50, 80],
      min: 50,
      median: 80,
      size: 3,
    });
  });
});
