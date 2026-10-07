// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {
  applyBrush,
  useAvailabilityPainter,
  type PaintedSlots,
} from "./useAvailabilityPainter";

const state = (available: number[], ifNeeded: number[]): PaintedSlots => ({
  available: new Set(available),
  ifNeeded: new Set(ifNeeded),
});

describe("applyBrush", () => {
  it("marks a slot available and removes it from if-needed", () => {
    const next = applyBrush(state([1], [2]), 2, "AVAILABLE");
    expect([...next.available]).toEqual([1, 2]);
    expect([...next.ifNeeded]).toEqual([]);
  });

  it("marks a slot if-needed and removes it from available", () => {
    const next = applyBrush(state([1, 2], []), 2, "IF_NEEDED");
    expect([...next.available]).toEqual([1]);
    expect([...next.ifNeeded]).toEqual([2]);
  });

  it("erases a slot from both sets", () => {
    const next = applyBrush(state([1], [2]), 1, "UNAVAILABLE");
    expect([...next.available]).toEqual([]);
    expect([...next.ifNeeded]).toEqual([2]);
  });

  it("does not mutate the previous state", () => {
    const prev = state([1], []);
    applyBrush(prev, 5, "AVAILABLE");
    expect([...prev.available]).toEqual([1]);
  });
});

describe("useAvailabilityPainter hook touch interactions", () => {
  it("prevents default on cancelable touchmove and extends drag", () => {
    const onAvailabilityChange = vi.fn();
    const { result } = renderHook(() =>
      useAvailabilityPainter({
        availableSlots: [],
        ifNeededSlots: [],
        brushMode: "AVAILABLE",
        slotsPerDay: 4,
        enabled: true,
        onAvailabilityChange,
      }),
    );

    const handlers = result.current.slotHandlers(1);
    expect(handlers.onTouchStart).toBeDefined();

    // Start touch drag on slot 1
    act(() => {
      handlers.onTouchStart!({
        touches: [{ clientX: 10, clientY: 10 } as React.Touch],
      } as unknown as React.TouchEvent);
    });

    expect(result.current.painted.available.has(1)).toBe(true);

    // Mock element under point returning a slot element
    const slotEl = document.createElement("div");
    slotEl.setAttribute("data-slot-index", "2");
    document.body.appendChild(slotEl);

    const origElementFromPoint =
      typeof document.elementFromPoint === "function"
        ? document.elementFromPoint.bind(document)
        : undefined;
    document.elementFromPoint = () => slotEl;

    const preventDefault = vi.fn();
    act(() => {
      result.current.onTouchMove({
        cancelable: true,
        preventDefault,
        touches: [{ clientX: 10, clientY: 20 } as React.Touch],
      } as unknown as React.TouchEvent);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.painted.available.has(2)).toBe(true);

    // Release touch
    act(() => {
      window.dispatchEvent(new Event("touchend"));
    });

    expect(onAvailabilityChange).toHaveBeenCalledWith({
      availableSlots: [1, 2],
      ifNeededSlots: [],
    });

    if (origElementFromPoint) {
      document.elementFromPoint = origElementFromPoint;
    } else {
      // @ts-expect-error jsdom cleanup
      delete document.elementFromPoint;
    }
    document.body.removeChild(slotEl);
  });
});
