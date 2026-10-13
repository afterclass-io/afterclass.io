// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type React from "react";

import type { SlotRange } from "@/modules/meetings/functions/slot-runs";
import { useRangeSelection } from "./useRangeSelection";

type RangeResult = { current: ReturnType<typeof useRangeSelection> };

afterEach(() => {
  cleanup();
  delete (document as Partial<Document>).elementFromPoint;
});

function renderRange(selectedRange: SlotRange | null = null, slotsPerDay = 4) {
  const onSelectRange = vi.fn();
  const { result } = renderHook(() =>
    useRangeSelection({
      slotsPerDay,
      selectedRange,
      enabled: true,
      onSelectRange,
    }),
  );
  return { result, onSelectRange };
}

const pointer = (button: number, pointerType: string) =>
  ({ button, pointerType }) as React.PointerEvent;

const touchEvent = (
  points: { clientX: number; clientY: number }[],
  preventDefault = vi.fn(),
) =>
  ({
    touches: points,
    cancelable: true,
    preventDefault,
  }) as unknown as React.TouchEvent;

const keyEvent = (key: string, preventDefault = vi.fn()) =>
  ({ key, preventDefault }) as unknown as React.KeyboardEvent;

function press(result: RangeResult, slot: number, event = pointer(0, "mouse")) {
  act(() => {
    result.current.slotHandlers(slot).onPointerDown!(event);
  });
}

function enter(result: RangeResult, slot: number) {
  act(() => {
    result.current.slotHandlers(slot).onPointerEnter!();
  });
}

function release() {
  act(() => {
    window.dispatchEvent(new Event("pointerup"));
  });
}

/** Makes document.elementFromPoint resolve to a grid cell for `slot`. */
function stubElementFromPoint(slot: number) {
  const cell = document.createElement("div");
  cell.dataset.slotIndex = String(slot);
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => cell,
  });
}

describe("useRangeSelection mouse drag", () => {
  it("previews and commits the inclusive range from the pressed slot to the entered slot", () => {
    const { result, onSelectRange } = renderRange();

    press(result, 1);
    expect(result.current.isDragging).toBe(true);
    expect(result.current.previewRange).toEqual({ start: 1, end: 1 });

    enter(result, 2);
    expect(result.current.previewRange).toEqual({ start: 1, end: 2 });

    release();
    expect(onSelectRange).toHaveBeenCalledTimes(1);
    expect(onSelectRange).toHaveBeenCalledWith({ start: 1, end: 2 });
    expect(result.current.isDragging).toBe(false);
    expect(result.current.previewRange).toBeNull();
  });

  it("orders the range start before end when dragging backwards", () => {
    const { result, onSelectRange } = renderRange();

    press(result, 2);
    enter(result, 0);
    expect(result.current.previewRange).toEqual({ start: 0, end: 2 });

    release();
    expect(onSelectRange).toHaveBeenCalledWith({ start: 0, end: 2 });
  });

  it("keeps a drag inside the anchor's day column", () => {
    const { result, onSelectRange } = renderRange(null, 4);

    press(result, 5);
    enter(result, 1);
    expect(result.current.previewRange).toEqual({ start: 4, end: 5 });
    release();
    expect(onSelectRange).toHaveBeenLastCalledWith({ start: 4, end: 5 });

    press(result, 1);
    enter(result, 6);
    expect(result.current.previewRange).toEqual({ start: 1, end: 3 });
    release();
    expect(onSelectRange).toHaveBeenLastCalledWith({ start: 1, end: 3 });
  });

  it("ignores non-primary buttons and touch pointers, and a release with no drag", () => {
    const { result, onSelectRange } = renderRange();

    press(result, 1, pointer(2, "mouse"));
    expect(result.current.isDragging).toBe(false);

    press(result, 1, pointer(0, "touch"));
    expect(result.current.isDragging).toBe(false);

    release();
    expect(onSelectRange).not.toHaveBeenCalled();
  });

  it("selects a single tapped slot when nothing is selected", () => {
    const { result, onSelectRange } = renderRange();

    press(result, 3);
    release();

    expect(onSelectRange).toHaveBeenCalledWith({ start: 3, end: 3 });
  });

  it("clears the selection when the only selected slot is tapped again", () => {
    const { result, onSelectRange } = renderRange({ start: 3, end: 3 });

    press(result, 3);
    release();

    expect(onSelectRange).toHaveBeenCalledWith(null);
  });

  it("selects a different tapped slot while a single slot is selected", () => {
    const { result, onSelectRange } = renderRange({ start: 3, end: 3 });

    press(result, 1);
    release();

    expect(onSelectRange).toHaveBeenCalledWith({ start: 1, end: 1 });
  });

  it("tapping the start of a multi-slot selection replaces it with that slot", () => {
    const { result, onSelectRange } = renderRange({ start: 2, end: 4 });

    press(result, 2);
    release();

    expect(onSelectRange).toHaveBeenCalledWith({ start: 2, end: 2 });
  });

  it("shows the saved selection as the preview when no drag is active", () => {
    const { result } = renderRange({ start: 0, end: 1 });

    expect(result.current.previewRange).toEqual({ start: 0, end: 1 });
    expect(result.current.isDragging).toBe(false);
  });
});

describe("useRangeSelection keyboard", () => {
  it("Enter selects the focused slot and Space behaves the same", () => {
    const { result, onSelectRange } = renderRange();
    const preventDefault = vi.fn();

    act(() => {
      result.current.slotHandlers(2).onKeyDown!(
        keyEvent("Enter", preventDefault),
      );
    });
    expect(onSelectRange).toHaveBeenLastCalledWith({ start: 2, end: 2 });
    expect(preventDefault).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.slotHandlers(2).onKeyDown!(keyEvent(" "));
    });
    expect(onSelectRange).toHaveBeenLastCalledWith({ start: 2, end: 2 });
  });

  it("Enter on the only selected slot clears the selection", () => {
    const { result, onSelectRange } = renderRange({ start: 2, end: 2 });

    act(() => {
      result.current.slotHandlers(2).onKeyDown!(keyEvent("Enter"));
    });

    expect(onSelectRange).toHaveBeenCalledWith(null);
  });

  it("other keys are ignored and not prevented", () => {
    const { result, onSelectRange } = renderRange();
    const preventDefault = vi.fn();

    act(() => {
      result.current.slotHandlers(2).onKeyDown!(keyEvent("a", preventDefault));
    });

    expect(onSelectRange).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe("useRangeSelection disabled and touch", () => {
  it("returns no handlers for any slot when disabled", () => {
    const { result } = renderHook(() =>
      useRangeSelection({
        slotsPerDay: 4,
        selectedRange: null,
        enabled: false,
      }),
    );

    expect(result.current.slotHandlers(1)).toEqual({});
  });

  it("selects the range from a one-finger touch drag and commits on touch end", () => {
    const { result, onSelectRange } = renderRange();
    const preventDefault = vi.fn();

    act(() => {
      result.current.slotHandlers(0).onTouchStart!(
        touchEvent([{ clientX: 0, clientY: 0 }]),
      );
    });
    expect(result.current.isDragging).toBe(true);

    stubElementFromPoint(2);
    act(() => {
      result.current.onTouchMove(
        touchEvent([{ clientX: 5, clientY: 5 }], preventDefault),
      );
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.previewRange).toEqual({ start: 0, end: 2 });

    act(() => {
      window.dispatchEvent(new Event("touchend"));
    });
    expect(onSelectRange).toHaveBeenCalledWith({ start: 0, end: 2 });
  });

  it("does not start a drag from a two-finger touch", () => {
    const { result } = renderRange();

    act(() => {
      result.current.slotHandlers(0).onTouchStart!(
        touchEvent([
          { clientX: 0, clientY: 0 },
          { clientX: 1, clientY: 1 },
        ]),
      );
    });

    expect(result.current.isDragging).toBe(false);
  });
});
