import { describe, expect, it } from "vitest";
import {
  applyDrag, applyResize, boxPositionFromLauncher, clampPosition, clampSize,
  defaultPosition, LAUNCHER_SIZE, MAX_WIDGET_SIZE, MIN_WIDGET_SIZE,
} from "./widget-geometry";

describe("widget-geometry", () => {
  it("clamps position inside the viewport with a margin", () => {
    const viewport = { width: 1000, height: 800 };
    const size = { width: 400, height: 560 };
    expect(clampPosition({ x: -50, y: 10_000 }, size, viewport)).toEqual({ x: 8, y: 800 - 560 - 8 });
  });
  it("never produces negative coordinates on tiny viewports", () => {
    const pos = clampPosition({ x: 500, y: 500 }, { width: 400, height: 560 }, { width: 420, height: 400 });
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });
  it("clamps size to min/max bounds", () => {
    expect(clampSize({ width: 100, height: 5000 })).toEqual({ width: MIN_WIDGET_SIZE.width, height: MAX_WIDGET_SIZE.height });
  });
  it("applies drag deltas and clamps", () => {
    expect(applyDrag({ x: 100, y: 100 }, { x: 30, y: -40 }, { width: 400, height: 560 }, { width: 1000, height: 800 })).toEqual({ x: 130, y: 60 });
  });
  it("applies resize deltas and clamps to the minimum size", () => {
    expect(applyResize(MIN_WIDGET_SIZE, { x: -200, y: -200 })).toEqual(MIN_WIDGET_SIZE);
  });
  it("defaults the LAUNCHER to the bottom-right corner of the viewport", () => {
    expect(defaultPosition({ width: 1000, height: 800 })).toEqual({
      x: 1000 - LAUNCHER_SIZE - 16,
      y: 800 - LAUNCHER_SIZE - 16,
    });
  });

  it("anchors the chat box so its bottom-right corner sits at the launcher's bottom-right", () => {
    const viewport = { width: 1000, height: 800 };
    const launcher = defaultPosition(viewport); // (928, 728) with LAUNCHER_SIZE 56
    const size = { width: 400, height: 560 };
    expect(boxPositionFromLauncher(launcher, size, viewport)).toEqual({
      x: launcher.x + LAUNCHER_SIZE - size.width,
      y: launcher.y + LAUNCHER_SIZE - size.height,
    });
  });

  it("clamps the derived box inside the viewport on tiny screens", () => {
    const viewport = { width: 320, height: 480 };
    const box = boxPositionFromLauncher({ x: 8, y: 8 }, { width: 400, height: 560 }, viewport);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
  });
});
