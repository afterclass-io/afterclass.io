// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOKENS } from "../tokens";
import { buildChartPoints } from "../utils/chart-points";
import { TrendChart } from "./TrendChart";

const manyTerms = buildChartPoints([
  { acadTermId: "AY2023/24-T1", round: "1", window: 1, min: 8, median: 18 },
  { acadTermId: "AY2024/25-T1", round: "1", window: 1, min: 10, median: 22 },
  { acadTermId: "AY2024/25-T1", round: "1A", window: 2, min: 12, median: 25 },
  { acadTermId: "AY2025/26-T1", round: "1", window: 1, min: 14, median: 28 },
  { acadTermId: "AY2026/27-T1", round: "1", window: 1, min: 16, median: 32 },
]);

describe("TrendChart", () => {
  it("renders min and median series with one dot per point", () => {
    render(
      <TrendChart points={manyTerms} currentKey={null} c={TOKENS.light} />,
    );
    const chart = screen.getByRole("img", { name: /bid trend/i });
    expect(chart.tagName.toLowerCase()).toBe("svg");
    expect(chart.querySelector('[data-series="median"]')).not.toBeNull();
    expect(chart.querySelector('[data-series="min"]')).not.toBeNull();
    expect(chart.querySelectorAll("circle")).toHaveLength(manyTerms.length);
  });

  it("shortens term labels and keeps all labels inside the viewBox", () => {
    render(
      <TrendChart points={manyTerms} currentKey={null} c={TOKENS.light} />,
    );
    const chart = screen.getByRole("img", { name: /bid trend/i });
    expect(chart.textContent).toContain("25/26-T1");
    expect(chart.textContent).not.toContain("AY2025/26-T1");
    const viewBox = chart.getAttribute("viewBox")!.split(" ").map(Number);
    const [, , vbW, vbH] = viewBox as [number, number, number, number];
    for (const t of Array.from(chart.querySelectorAll("text"))) {
      const x = Number(t.getAttribute("x"));
      const y = Number(t.getAttribute("y"));
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(vbW);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(vbH);
    }
  });

  it("staggers labels when >2 points and anchors the now marker off-center", () => {
    render(
      <TrendChart
        points={manyTerms}
        currentKey={manyTerms[manyTerms.length - 1]!.key}
        c={TOKENS.light}
      />,
    );
    const chart = screen.getByRole("img", { name: /bid trend/i });
    const labelYs = Array.from(chart.querySelectorAll("text"))
      .map((t) => Number(t.getAttribute("y")))
      .filter((yy) => yy > 150);
    expect(new Set(labelYs).size).toBeGreaterThanOrEqual(2);
    const now = Array.from(chart.querySelectorAll("text")).find(
      (t) => t.textContent === "now",
    );
    expect(now).toBeDefined();
    expect(Number(now!.getAttribute("font-size"))).toBeLessThanOrEqual(9);
    expect(now!.getAttribute("text-anchor")).not.toBe("middle");
    expect(Number(now!.getAttribute("y"))).toBeLessThan(16);
  });

  it("extends every term band half a step with one boundary line per transition", () => {
    render(
      <TrendChart points={manyTerms} currentKey={null} c={TOKENS.light} />,
    );
    const chart = screen.getByRole("img", { name: /bid trend/i });
    // Odd-indexed term groups render shaded bands: 4 terms -> bands at 1, 3.
    const bands = Array.from(chart.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("fill") === TOKENS.light.border,
    );
    expect(bands).toHaveLength(2);
    // 4 contiguous terms -> 3 transition boundaries.
    const boundaries = Array.from(chart.querySelectorAll("line")).filter(
      (l) => l.getAttribute("stroke-width") === "1",
    );
    expect(boundaries).toHaveLength(3);
  });

  it("gates the now highlight on the visible current term, not the prediction key", () => {
    const { rerender } = render(
      <TrendChart
        points={manyTerms}
        currentKey={null}
        currentAcadTermId="AY2026/27-T1"
        c={TOKENS.light}
      />,
    );
    let chart = screen.getByRole("img", { name: /bid trend/i });
    expect(
      Array.from(chart.querySelectorAll("text")).find(
        (t) => t.textContent === "now",
      ),
    ).toBeDefined();
    expect(
      Array.from(chart.querySelectorAll("rect")).filter(
        (r) => r.getAttribute("fill") === "#2563eb",
      ),
    ).toHaveLength(1);

    // Filtered-out term -> no highlight even with a matching prediction key.
    const visible = manyTerms.slice(0, 3);
    rerender(
      <TrendChart
        points={visible}
        currentKey={manyTerms[manyTerms.length - 1]!.key}
        currentAcadTermId="AY2026/27-T1"
        c={TOKENS.light}
      />,
    );
    chart = screen.getByRole("img", { name: /bid trend/i });
    expect(
      Array.from(chart.querySelectorAll("text")).find(
        (t) => t.textContent === "now",
      ),
    ).toBeUndefined();
    expect(
      Array.from(chart.querySelectorAll("rect")).filter(
        (r) => r.getAttribute("fill") === "#2563eb",
      ),
    ).toHaveLength(0);
  });
});
