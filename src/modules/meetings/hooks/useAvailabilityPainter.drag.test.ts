// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type React from "react";

import type { AvailabilityBrushMode } from "@/modules/meetings/components/grid/MeetingAvailabilityBrush";
import { useAvailabilityPainter } from "./useAvailabilityPainter";

type PainterResult = { current: ReturnType<typeof useAvailabilityPainter> };

afterEach(() => {
  cleanup();
});

function renderPainter({
  available = [],
  ifNeeded = [],
  brushMode = "AVAILABLE",
  enabled = true,
}: {
  available?: number[];
  ifNeeded?: number[];
  brushMode?: AvailabilityBrushMode;
  enabled?: boolean;
} = {}) {
  const onAvailabilityChange = vi.fn();
  const { result } = renderHook(() =>
    useAvailabilityPainter({
      availableSlots: available,
      ifNeededSlots: ifNeeded,
      brushMode,
      slotsPerDay: 4,
      enabled,
      onAvailabilityChange,
    }),
  );
  return { result, onAvailabilityChange };
}

const mouse = (button = 0) =>
  ({ button, pointerType: "mouse" }) as React.PointerEvent;

function press(result: PainterResult, slot: number, event = mouse()) {
  act(() => {
    result.current.slotHandlers(slot).onPointerDown!(event);
  });
}

function enter(result: PainterResult, slot: number) {
  act(() => {
    result.current.slotHandlers(slot).onPointerEnter!();
  });
}

function release() {
  act(() => {
    window.dispatchEvent(new Event("pointerup"));
  });
}

describe("useAvailabilityPainter mouse drag", () => {
  it("paints the pressed slot and every slot crossed by the pointer with the brush mode", () => {
    const { result, onAvailabilityChange } = renderPainter();

    press(result, 0);
    expect([...result.current.painted.available]).toEqual([0]);
    expect(result.current.isDragging).toBe(true);

    enter(result, 2);
    expect([...result.current.painted.available]).toEqual([0, 1, 2]);

    release();
    expect(onAvailabilityChange).toHaveBeenCalledTimes(1);
    expect(onAvailabilityChange).toHaveBeenCalledWith({
      availableSlots: [0, 1, 2],
      ifNeededSlots: [],
    });
    expect(result.current.isDragging).toBe(false);
  });

  it("paints backwards across the slots a fast drag jumps over", () => {
    const { result, onAvailabilityChange } = renderPainter();

    press(result, 3);
    enter(result, 1);
    expect([...result.current.painted.available].sort()).toEqual([1, 2, 3]);

    release();
    expect(onAvailabilityChange).toHaveBeenCalledWith({
      availableSlots: [1, 2, 3],
      ifNeededSlots: [],
    });
  });

  it("erases instead of painting when the pressed slot is already painted with the brush", () => {
    const { result, onAvailabilityChange } = renderPainter({ available: [1] });

    press(result, 1);
    expect([...result.current.painted.available]).toEqual([]);

    enter(result, 2);
    release();

    expect(onAvailabilityChange).toHaveBeenCalledWith({
      availableSlots: [],
      ifNeededSlots: [],
    });
  });

  it("IF_NEEDED brush moves a slot from available to if-needed", () => {
    const { result, onAvailabilityChange } = renderPainter({
      available: [2],
      brushMode: "IF_NEEDED",
    });

    press(result, 2);
    release();

    expect(onAvailabilityChange).toHaveBeenCalledWith({
      availableSlots: [],
      ifNeededSlots: [2],
    });
  });

  it("IF_NEEDED brush erases a slot already marked if-needed", () => {
    const { result, onAvailabilityChange } = renderPainter({
      ifNeeded: [2],
      brushMode: "IF_NEEDED",
    });

    press(result, 2);
    release();

    expect(onAvailabilityChange).toHaveBeenCalledWith({
      availableSlots: [],
      ifNeededSlots: [],
    });
  });

  it("a press on a slot painted only with the other brush paints with the current brush", () => {
    const { result, onAvailabilityChange } = renderPainter({
      available: [1],
      brushMode: "IF_NEEDED",
    });

    press(result, 1);
    release();

    expect(onAvailabilityChange).toHaveBeenCalledWith({
      availableSlots: [],
      ifNeededSlots: [1],
    });
  });

  it("a jump into another day column paints only the entered slot", () => {
    const { result, onAvailabilityChange } = renderPainter();

    press(result, 3);
    enter(result, 4);
    expect([...result.current.painted.available]).toEqual([3, 4]);

    release();
    expect(onAvailabilityChange).toHaveBeenCalledWith({
      availableSlots: [3, 4],
      ifNeededSlots: [],
    });
  });

  it("ignores pointer enter outside a drag", () => {
    const { result, onAvailabilityChange } = renderPainter();

    enter(result, 2);
    expect([...result.current.painted.available]).toEqual([]);

    release();
    expect(onAvailabilityChange).not.toHaveBeenCalled();
  });

  it("ignores non-primary buttons and touch pointers on pointer down", () => {
    const { result, onAvailabilityChange } = renderPainter();

    act(() => {
      result.current.slotHandlers(1).onPointerDown!({
        button: 2,
        pointerType: "mouse",
      } as React.PointerEvent);
    });
    act(() => {
      result.current.slotHandlers(1).onPointerDown!({
        button: 0,
        pointerType: "touch",
      } as React.PointerEvent);
    });

    expect(result.current.isDragging).toBe(false);
    release();
    expect(onAvailabilityChange).not.toHaveBeenCalled();
  });

  it("returns no pointer handlers when disabled", () => {
    const { result } = renderPainter({ enabled: false });

    expect(result.current.slotHandlers(1)).toEqual({});
  });
});
