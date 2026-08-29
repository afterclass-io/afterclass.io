// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { type PointerEvent as ReactPointerEvent } from "react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { useWidgetPosition } from "./use-widget-position";
import { LAUNCHER_SIZE } from "./widget-geometry";

// Storage key bumped to v3 (offset shape); legacy v2 entries are ignored.
const STORAGE_KEY = "assistant-widget-geometry:v3";

beforeEach(() => {
  window.localStorage.clear();
  // The drag path calls setPointerCapture on pointer-down; keep it inert under jsdom.
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe("useWidgetPosition - restore path", () => {
  it("restores offsets that map to bottom-right on the stored viewport", () => {
    // Stored as right/bottom offsets: on 1000x800 with launcher at (928,728) => (16,16)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ right: 16, bottom: 16, width: 400, height: 560 }));

    const { result } = renderHook(() => useWidgetPosition({ width: 1000, height: 800 }));

    expect(result.current.position).toEqual({ x: 928, y: 728 });
  });

  it("ignores legacy v2 absolute x/y shape and falls back to bottom-right default", () => {
    window.localStorage.setItem("assistant-widget-geometry:v2", JSON.stringify({ x: 200, y: 200, width: 400, height: 560 }));
    const { result } = renderHook(() => useWidgetPosition({ width: 1280, height: 800 }));
    // default bottom-right: (1280-56-16, 800-56-16) = (1208, 728)
    expect(result.current.position).toEqual({ x: 1280 - 56 - 16, y: 800 - 56 - 16 });
  });

  it("restore on a WIDER viewport re-anchors to bottom-right (same 16px margin)", () => {
    // User last saved offsets on a narrow 1000x800 screen (launcher was bottom-right there).
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ right: 16, bottom: 16, width: 400, height: 560 }));

    // Open on a wide 1600x900 monitor - must re-derive to that monitor's bottom-right.
    const { result } = renderHook(() => useWidgetPosition({ width: 1600, height: 900 }));

    expect(result.current.position).toEqual({
      x: 1600 - LAUNCHER_SIZE - 16,
      y: 900 - LAUNCHER_SIZE - 16,
    });
  });

  it("re-anchors on viewport resize (e.g. window grows)", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ right: 16, bottom: 16, width: 400, height: 560 }));
    const { result, rerender } = renderHook(({ vw, vh }: { vw: number; vh: number }) => useWidgetPosition({ width: vw, height: vh }), {
      initialProps: { vw: 1000, vh: 800 },
    });
    expect(result.current.position).toEqual({ x: 1000 - 56 - 16, y: 800 - 56 - 16 });

    rerender({ vw: 1600, vh: 900 });

    expect(result.current.position).toEqual({
      x: 1600 - LAUNCHER_SIZE - 16,
      y: 900 - LAUNCHER_SIZE - 16,
    });
  });

  it("clamps offsets if viewport shrinks so launcher never goes off-screen", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ right: 16, bottom: 16, width: 400, height: 560 }));
    const { result, rerender } = renderHook(({ vw, vh }: { vw: number; vh: number }) => useWidgetPosition({ width: vw, height: vh }), {
      initialProps: { vw: 1600, vh: 900 },
    });
    // Shrink to a tiny viewport - offsets clamp via clampPosition
    rerender({ vw: 200, vh: 200 });
    const pos = result.current.position!;
    // With WIDGET_MARGIN=8, clamped launcher is at (8,8) on a tiny screen.
    expect(pos.x).toBeGreaterThanOrEqual(8);
    expect(pos.y).toBeGreaterThanOrEqual(8);
    expect(pos.x).toBeLessThanOrEqual(200 - LAUNCHER_SIZE - 8);
    expect(pos.y).toBeLessThanOrEqual(200 - LAUNCHER_SIZE - 8);
  });

  it("dragging off-center, shrinking, then growing restores the original offsets (clamp is display-only)", () => {
    // Start clean (no stored offsets) — default on 1600x900 is bottom-right (1528, 828) => offsets (16,16).
    // Drag to an off-center position, shrink so the original offsets are off-screen, then grow back.
    const target = document.createElement("div");
    const capture = vi.fn<(pointerId: number) => void>();
    target.setPointerCapture = capture;

    const pointer = (x: number, y: number, pointerId = 1) =>
      ({ clientX: x, clientY: y, pointerId, currentTarget: target }) as unknown as ReactPointerEvent;

    const { result, rerender } = renderHook(
      ({ vw, vh }: { vw: number; vh: number }) => useWidgetPosition({ width: vw, height: vh }),
      { initialProps: { vw: 1600, vh: 900 } },
    );

    // Default position on 1600x900
    const defaultPos = { x: 1600 - LAUNCHER_SIZE - 16, y: 900 - LAUNCHER_SIZE - 16 };
    expect(result.current.position).toEqual(defaultPos);

    // Drag off-center to (700, 300): delta = (700-1528, 300-828) = (-828, -528).
    // Use pointer origin (500,500) so coordinates stay in a plausible range.
    const startPointer = { x: 500, y: 500 };
    const offCenter = { x: 700, y: 300 };
    const delta = { x: offCenter.x - defaultPos.x, y: offCenter.y - defaultPos.y };

    act(() => {
      result.current.dragHandlers.onPointerDown(pointer(startPointer.x, startPointer.y));
    });
    act(() => {
      result.current.dragHandlers.onPointerMove(pointer(startPointer.x + delta.x, startPointer.y + delta.y));
    });
    act(() => {
      result.current.dragHandlers.onPointerUp();
    });

    expect(result.current.position).toEqual(offCenter);

    // Narrow/shrink: original offsets (1600-700-56=844, 900-300-56=544) are off-screen here.
    // Display must clamp on-screen, but persisted offsets must remain the unclamped originals.
    const offCenterOffsets = {
      right: 1600 - offCenter.x - LAUNCHER_SIZE,
      bottom: 900 - offCenter.y - LAUNCHER_SIZE,
    };
    let stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as { right: number; bottom: number };
    expect(stored.right).toBe(offCenterOffsets.right);
    expect(stored.bottom).toBe(offCenterOffsets.bottom);

    rerender({ vw: 320, vh: 320 });

    const shrunk = result.current.position!;
    expect(shrunk.x).toBeGreaterThanOrEqual(8);
    expect(shrunk.y).toBeGreaterThanOrEqual(8);
    expect(shrunk.x).toBeLessThanOrEqual(320 - LAUNCHER_SIZE - 8);
    expect(shrunk.y).toBeLessThanOrEqual(320 - LAUNCHER_SIZE - 8);

    // Persisted offsets must NOT have been overwritten with clamped display values.
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as { right: number; bottom: number };
    expect(stored.right).toBe(offCenterOffsets.right);
    expect(stored.bottom).toBe(offCenterOffsets.bottom);

    // Grow back — original off-center position is restored, not the clamped corner.
    rerender({ vw: 1600, vh: 900 });
    expect(result.current.position).toEqual(offCenter);
  });
});

describe("useWidgetPosition drag", () => {
  // The handlers read `e.currentTarget` (setPointerCapture), so every synthetic
  // event must carry a `currentTarget` element. Hoisted to the describe scope.
  let target: HTMLElement;
  let capture: Mock<(pointerId: number) => void>;

  beforeEach(() => {
    target = document.createElement("div");
    capture = vi.fn<(pointerId: number) => void>();
    target.setPointerCapture = capture;
  });

  const pointer = (x: number, y: number, pointerId = 1) =>
    ({ clientX: x, clientY: y, pointerId, currentTarget: target }) as unknown as ReactPointerEvent;

  it("does not capture the pointer on a plain press (click must not be swallowed)", () => {
    const { result } = renderHook(() =>
      useWidgetPosition({ width: 1280, height: 800 }),
    );
    const { dragHandlers } = result.current;

    act(() => {
      dragHandlers.onPointerDown(pointer(100, 100));
    });
    act(() => {
      dragHandlers.onPointerUp();
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it("captures and drags only after the pointer moves past the threshold", () => {
    const { result } = renderHook(() =>
      useWidgetPosition({ width: 1280, height: 800 }),
    );
    const { dragHandlers } = result.current;

    act(() => {
      dragHandlers.onPointerDown(pointer(100, 100));
    });
    // Small move (< 4px) - still not a drag.
    act(() => {
      dragHandlers.onPointerMove(pointer(102, 101));
    });
    expect(capture).not.toHaveBeenCalled();

    // Move past threshold - drag starts, launcher position updates.
    act(() => {
      dragHandlers.onPointerMove(pointer(130, 120));
    });
    expect(capture).toHaveBeenCalledTimes(1);
    act(() => {
      dragHandlers.onPointerUp();
    });
    // Verified against the real clampPosition (WIDGET_MARGIN = 8): dragging the
    // default (1280-56-16, 800-56-16) = (1208, 728) by (+30, +20) clamps to
    // (1280-56-8, 800-56-8) = (1216, 736) with the launcher's 56x56 box.
    expect(result.current.position).toEqual({
      x: 1280 - 56 - 8,
      y: 800 - 56 - 8,
    });
  });
});
