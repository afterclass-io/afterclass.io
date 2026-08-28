// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { type PointerEvent as ReactPointerEvent } from "react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { useWidgetPosition } from "./use-widget-position";

// Must match STORAGE_KEY in use-widget-position.ts - seed the ACTUAL key so
// the restore path is really exercised; a key mismatch would silently fall
// back to defaultPosition.
const STORAGE_KEY = "assistant-widget-geometry:v2";

beforeEach(() => {
  window.localStorage.clear();
  // The drag path calls setPointerCapture on pointer-down; keep it inert under jsdom.
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe("useWidgetPosition - restore path", () => {
  it("restores a stored bottom-right launcher position WITHOUT clamping it to the box size", () => {
    // Seed BEFORE renderHook: the hook reads localStorage synchronously on mount.
    // Bottom-right launcher position for a 1000x800 viewport (56x56 launcher):
    // x = 1000 - 56 - 16 = 928, y = 800 - 56 - 16 = 728.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: 928, y: 728, width: 400, height: 560 }));

    const { result } = renderHook(() => useWidgetPosition({ width: 1000, height: 800 }));

    // Regression guard: clamping with the 400x560 box would snap this to
    // (1000 - 400 - 8, 800 - 560 - 8) = (592, 232). It must stay launcher-anchored.
    expect(result.current.position).toEqual({ x: 928, y: 728 });
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
