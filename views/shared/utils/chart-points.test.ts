import { describe, expect, it } from "vitest";
import { buildChartPoints, computeTermGroups, pointKey } from "./chart-points";

const row = (
  acadTermId: string,
  round: string,
  window: number,
  min: number | null,
  median: number | null,
) => ({ acadTermId, round, window, min, median });

describe("buildChartPoints", () => {
  it("dedupes to one row per term+round+window key (lowest min/median wins)", () => {
    const points = buildChartPoints([
      row("AY2024/25-T1", "1", 1, 20, 30),
      row("AY2024/25-T1", "1", 1, 10, 22),
      row("AY2025/26-T1", "1", 1, 14, 28),
    ]);
    expect(points).toHaveLength(2);
    const dup = points.find((p) => p.acadTermId === "AY2024/25-T1");
    expect(dup?.min).toBe(10);
    expect(dup?.median).toBe(22);
  });

  it("drops rows with null min/median (mirror of normalizeHistory)", () => {
    const points = buildChartPoints([
      row("AY2024/25-T1", "1", 1, null, 22),
      row("AY2024/25-T1", "1", 1, 10, null),
      row("AY2025/26-T1", "1", 1, 14, 28),
    ]);
    expect(points).toHaveLength(1);
    expect(points[0]?.acadTermId).toBe("AY2025/26-T1");
  });

  it("sorts by term, then BOSS round order, then window", () => {
    const points = buildChartPoints([
      row("AY2024/25-T1", "1A", 2, 12, 25),
      row("AY2025/26-T1", "1", 1, 14, 28),
      row("AY2024/25-T1", "1", 1, 10, 22),
      // BOSS order beats localeCompare-numeric: "2" sorts before "10".
      row("AY2024/25-T1", "2", 1, 11, 23),
      row("AY2024/25-T1", "10", 1, 9, 21),
    ]);
    expect(points.map((p) => `${p.acadTermId}/${p.round}`)).toEqual([
      "AY2024/25-T1/1",
      "AY2024/25-T1/1A",
      "AY2024/25-T1/2",
      "AY2024/25-T1/10",
      "AY2025/26-T1/1",
    ]);
  });

  it("builds slash-safe keys (terms containing '/' are not split)", () => {
    expect(
      pointKey({ acadTermId: "AY2024/25-T1", round: "1", window: 1 }),
    ).toBe("AY2024/25-T1/1/1");
    const points = buildChartPoints([row("AY2024/25-T1", "1", 1, 10, 22)]);
    expect(points[0]?.key).toBe("AY2024/25-T1/1/1");
    expect(points[0]?.acadTermId).toBe("AY2024/25-T1");
  });
});

describe("computeTermGroups", () => {
  it("groups contiguous same-term runs", () => {
    const points = buildChartPoints([
      row("AY2024/25-T1", "1", 1, 10, 22),
      row("AY2024/25-T1", "1A", 2, 12, 25),
      row("AY2025/26-T1", "1", 1, 14, 28),
    ]);
    expect(computeTermGroups(points)).toEqual([
      [points[0]!.key, points[1]!.key],
      [points[2]!.key],
    ]);
  });
});
