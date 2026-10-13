import { slotIndexAtPoint } from "@/modules/meetings/hooks/slot-pointer";

export type SlotDragHandlers = {
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerEnter?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
};

/**
 * Pointer and touch handlers for one grid slot. A mouse press starts a drag on
 * the primary button only, a touch starts it with a single finger, and entering
 * the slot extends the drag.
 */
export function slotDragHandlers(
  slot: number,
  startDrag: (slot: number) => void,
  extendDrag: (slot: number) => void,
): SlotDragHandlers {
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button === 0 && e.pointerType !== "touch") startDrag(slot);
    },
    onPointerEnter: () => extendDrag(slot),
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length === 1) startDrag(slot);
    },
  };
}

/** Extends the drag over whichever slot the finger is on. Call from onTouchMove. */
export function handleTouchDragMove(
  e: React.TouchEvent,
  extendDrag: (slot: number) => void,
) {
  if (e.cancelable) e.preventDefault();
  const touch = e.touches[0];
  const slot = touch && slotIndexAtPoint(touch.clientX, touch.clientY);
  if (slot !== null && slot !== undefined) extendDrag(slot);
}
