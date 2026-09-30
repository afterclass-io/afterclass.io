// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BidChart } from "./BidChart";
import { computeAcadTermGroups } from "../utils/acad-term-groups";
import {
  computeTermBandBounds,
  computeTermBoundaries,
  shouldShowNowMarker,
  withPlotIndex,
} from "../utils/term-bands";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {
        void 0;
      }
      unobserve(): void {
        void 0;
      }
      disconnect(): void {
        void 0;
      }
    },
  );
});

const chartData = [
  {
    bidWindow: "AY202526T1/1/1",
    price: [10, 16] as [number, number],
    size: 50,
  },
  {
    bidWindow: "AY202526T1/1A/1",
    price: [11, 18] as [number, number],
    size: 50,
  },
  {
    bidWindow: "AY202627T1/1/1",
    price: [18, 25] as [number, number],
    size: 45,
  },
  {
    bidWindow: "AY202627T1/1A/1",
    price: [19, 27] as [number, number],
    size: 45,
  },
];

describe("BidChart", () => {
  it("renders a boundary divider and the current term highlight without any now text", () => {
    const { container } = render(
      <BidChart chartData={chartData} currentAcadTermId="AY202627T1" />,
    );
    expect(
      Array.from(container.querySelectorAll("*")).find(
        (el) => el.textContent === "now",
      ),
    ).toBeUndefined();

    const sorted = withPlotIndex(
      [...chartData].map((d) => ({
        bidWindow: d.bidWindow,
        price: d.price,
        min: d.price[0],
        median: d.price[1],
        size: d.size,
      })),
    );
    const groups = computeAcadTermGroups(sorted);
    expect(computeTermBoundaries(sorted)).toHaveLength(1);
    expect(shouldShowNowMarker(sorted, "AY202627T1")).toBe(true);
    const nowBand = computeTermBandBounds(sorted, groups).find(
      (b) => b.acadTermId === "AY202627T1",
    );
    expect(nowBand).toBeDefined();
  });

  it("renders no highlight when the current term is not visible", () => {
    const { container } = render(
      <BidChart chartData={chartData} currentAcadTermId="AY202425T1" />,
    );
    expect(
      Array.from(container.querySelectorAll("*")).find(
        (el) => el.textContent === "now",
      ),
    ).toBeUndefined();

    const sorted = withPlotIndex(
      [...chartData].map((d) => ({
        bidWindow: d.bidWindow,
        price: d.price,
        min: d.price[0],
        median: d.price[1],
        size: d.size,
      })),
    );
    expect(shouldShowNowMarker(sorted, "AY202425T1")).toBe(false);
  });
});
