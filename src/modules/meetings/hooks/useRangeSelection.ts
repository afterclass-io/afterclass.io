"use client";

import { useCallback, useRef, useState } from "react";

import {
  dragSelectionRange,
  type SlotRange,
} from "@/modules/meetings/functions/slot-runs";
import {
  slotIndexAtPoint,
  useReleaseListener,
} from "@/modules/meetings/hooks/slot-pointer";

export type UseRangeSelectionOptions = {
  slotsPerDay: number;
  selectedRange: SlotRange | null;
  enabled: boolean;
  onSelectRange?: (range: SlotRange | null) => void;
};

const isSingleSlot = (range: SlotRange | null, slot: number) =>
  range?.start === slot && range.end === slot;

/**
 * Click or drag inside one day column to select a time range. Clicking the
 * only selected slot again clears the selection.
 */
export function useRangeSelection({
  slotsPerDay,
  selectedRange,
  enabled,
  onSelectRange,
}: UseRangeSelectionOptions) {
  const [dragRange, setDragRange] = useState<SlotRange | null>(null);
  const anchorRef = useRef<number | null>(null);
  const dragRangeRef = useRef<SlotRange | null>(null);

  const updateDrag = (range: SlotRange | null) => {
    dragRangeRef.current = range;
    setDragRange(range);
  };

  const startDrag = (slot: number) => {
    anchorRef.current = slot;
    updateDrag({ start: slot, end: slot });
  };

  const extendDrag = (slot: number) => {
    if (anchorRef.current !== null) {
      updateDrag(dragSelectionRange(anchorRef.current, slot, slotsPerDay));
    }
  };

  const finishDrag = useCallback(() => {
    const range = dragRangeRef.current;
    if (anchorRef.current === null || !range) return;
    anchorRef.current = null;
    dragRangeRef.current = null;
    setDragRange(null);

    const isToggleOff =
      range.start === range.end && isSingleSlot(selectedRange, range.start);
    onSelectRange?.(isToggleOff ? null : range);
  }, [onSelectRange, selectedRange]);

  useReleaseListener(finishDrag);

  return {
    previewRange: dragRange ?? selectedRange,
    isDragging: dragRange !== null,
    slotHandlers: (slot: number) =>
      enabled
        ? {
            onPointerDown: (e: React.PointerEvent) => {
              if (e.button === 0 && e.pointerType !== "touch") startDrag(slot);
            },
            onPointerEnter: () => extendDrag(slot),
            onTouchStart: (e: React.TouchEvent) => {
              if (e.touches.length === 1) startDrag(slot);
            },
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectRange?.(
                  isSingleSlot(selectedRange, slot)
                    ? null
                    : { start: slot, end: slot },
                );
              }
            },
          }
        : {},
    onTouchMove: (e: React.TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      const slot = touch && slotIndexAtPoint(touch.clientX, touch.clientY);
      if (slot !== null && slot !== undefined) extendDrag(slot);
    },
  };
}
