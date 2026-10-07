"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AvailabilityBrushMode } from "@/modules/meetings/components/grid/MeetingAvailabilityBrush";
import { slotsBetween } from "@/modules/meetings/functions/slot-runs";
import {
  slotIndexAtPoint,
  useReleaseListener,
} from "@/modules/meetings/hooks/slot-pointer";

export type PaintedSlots = {
  available: Set<number>;
  ifNeeded: Set<number>;
};

/** Pure brush application: a slot is in at most one of the two sets. */
export function applyBrush(
  state: PaintedSlots,
  slot: number,
  mode: AvailabilityBrushMode,
): PaintedSlots {
  const available = new Set(state.available);
  const ifNeeded = new Set(state.ifNeeded);
  available.delete(slot);
  ifNeeded.delete(slot);
  if (mode === "AVAILABLE") available.add(slot);
  if (mode === "IF_NEEDED") ifNeeded.add(slot);
  return { available, ifNeeded };
}

const sorted = (slots: Set<number>) => [...slots].sort((a, b) => a - b);

export type UseAvailabilityPainterOptions = {
  availableSlots: number[];
  ifNeededSlots: number[];
  brushMode: AvailabilityBrushMode;
  slotsPerDay: number;
  enabled: boolean;
  onAvailabilityChange?: (slots: {
    availableSlots: number[];
    ifNeededSlots: number[];
  }) => void;
};

function areSlotArraysEqual(a: number[], b: number[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Drag-to-paint engine. Painted slots live in local state so painting stays
 * instant; the parent is notified once per completed drag.
 */
export function useAvailabilityPainter({
  availableSlots,
  ifNeededSlots,
  brushMode,
  slotsPerDay,
  enabled,
  onAvailabilityChange,
}: UseAvailabilityPainterOptions) {
  const [painted, setPainted] = useState<PaintedSlots>(() => ({
    available: new Set(availableSlots),
    ifNeeded: new Set(ifNeededSlots),
  }));

  // Re-sync when the parent supplies new slot arrays (save, autofill, clear).
  const [prevProps, setPrevProps] = useState({ availableSlots, ifNeededSlots });
  if (
    !areSlotArraysEqual(prevProps.availableSlots, availableSlots) ||
    !areSlotArraysEqual(prevProps.ifNeededSlots, ifNeededSlots)
  ) {
    setPrevProps({ availableSlots, ifNeededSlots });
    setPainted({
      available: new Set(availableSlots),
      ifNeeded: new Set(ifNeededSlots),
    });
  }

  const latestRef = useRef(painted);
  useEffect(() => {
    latestRef.current = painted;
  }, [painted]);

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<AvailabilityBrushMode>("AVAILABLE");
  const touchedRef = useRef<Set<number>>(new Set());
  const lastSlotRef = useRef<number | null>(null);

  const paint = useCallback((slot: number) => {
    touchedRef.current.add(slot);
    lastSlotRef.current = slot;
    setPainted((prev) => applyBrush(prev, slot, dragModeRef.current));
  }, []);

  const startDrag = (slot: number) => {
    const alreadyPainted =
      (brushMode === "AVAILABLE" && painted.available.has(slot)) ||
      (brushMode === "IF_NEEDED" && painted.ifNeeded.has(slot));
    dragModeRef.current = alreadyPainted ? "UNAVAILABLE" : brushMode;
    touchedRef.current = new Set();
    isDraggingRef.current = true;
    setIsDragging(true);
    paint(slot);
  };

  const finishDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    const { available, ifNeeded } = latestRef.current;
    onAvailabilityChange?.({
      availableSlots: sorted(available),
      ifNeededSlots: sorted(ifNeeded),
    });
  }, [onAvailabilityChange]);

  useReleaseListener(finishDrag);

  const extendDrag = (slot: number) => {
    const last = lastSlotRef.current;
    if (!isDraggingRef.current || last === null || touchedRef.current.has(slot)) {
      return;
    }
    for (const crossed of slotsBetween(last, slot, slotsPerDay)) paint(crossed);
  };

  return {
    painted,
    isDragging,
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
