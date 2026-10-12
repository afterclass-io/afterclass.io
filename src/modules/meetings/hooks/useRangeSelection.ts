"use client";

import { useCallback, useRef, useState } from "react";

import {
  dragSelectionRange,
  type SlotRange,
} from "@/modules/meetings/functions/slot-runs";
import {
  handleTouchDragMove,
  type SlotDragHandlers,
  slotDragHandlers,
} from "@/modules/meetings/hooks/slot-drag-handlers";
import { useReleaseListener } from "@/modules/meetings/hooks/slot-pointer";

export type UseRangeSelectionOptions = {
  slotsPerDay: number;
  selectedRange: SlotRange | null;
  enabled: boolean;
  onSelectRange?: (range: SlotRange | null) => void;
};

type RangeSlotHandlers = SlotDragHandlers & {
  onKeyDown?: (e: React.KeyboardEvent) => void;
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
    slotHandlers: (slot: number): RangeSlotHandlers =>
      enabled
        ? {
            ...slotDragHandlers(slot, startDrag, extendDrag),
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
    onTouchMove: (e: React.TouchEvent) => handleTouchDragMove(e, extendDrag),
  };
}
