import { describe, expect, it } from "vitest";

import {
  clampLabelCenterX as srcClamp,
  estimateLabelWidth as srcEstimate,
} from "../../../src/modules/bidding/utils/chart-label-layout";
import { compareRounds as srcCompareRounds } from "../../../src/modules/bidding/utils/round-order";
import { clampLabelCenterX, estimateLabelWidth } from "./chart-label-layout";
import { compareRounds } from "./round-order";

// MCP views are a sandboxed bundle and cannot import from `@/`, so these two
// helpers exist twice: once under src/modules/bidding/utils (the website) and
// once here. This test keeps the copies equal, like tokens.drift.test.ts does
// for the theme tokens.

const ROUNDS = ["1", "1A", "1B", "1C", "1F", "2", "2A", "3", "AA", "ZZ", ""];

describe("round-order parity with src/modules/bidding/utils", () => {
  it("orders every pair of rounds the same way", () => {
    for (const a of ROUNDS) {
      for (const b of ROUNDS) {
        expect(Math.sign(compareRounds(a, b))).toBe(
          Math.sign(srcCompareRounds(a, b)),
        );
      }
    }
  });
});

describe("chart-label-layout parity with src/modules/bidding/utils", () => {
  it("estimates the same label width", () => {
    for (const text of ["", "T1", "23-24 T1", "AY2023/24 Term 1 long label"]) {
      expect(estimateLabelWidth(text)).toBe(srcEstimate(text));
    }
  });

  it("clamps the same label center", () => {
    const centers = [-50, 0, 40, 150, 400, 900];
    const widths = [40, 80, 300, 2000];
    for (const center of centers) {
      for (const width of widths) {
        expect(clampLabelCenterX(center, 50, 750, width)).toBe(
          srcClamp(center, 50, 750, width),
        );
      }
    }
  });
});
