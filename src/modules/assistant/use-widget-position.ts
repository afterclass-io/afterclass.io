"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyDrag, applyResize, clampPosition, clampSize, DEFAULT_WIDGET_SIZE,
  defaultPosition, LAUNCHER_SIZE, type Point, type Size,
} from "./widget-geometry";

const STORAGE_KEY = "assistant-widget-geometry:v2";

const DRAG_THRESHOLD = 4; // px of pointer movement before a press becomes a drag

type Stored = { x: number; y: number; width: number; height: number };

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    return {
      x: parsed.x, y: parsed.y,
      width: typeof parsed.width === "number" ? parsed.width : DEFAULT_WIDGET_SIZE.width,
      height: typeof parsed.height === "number" ? parsed.height : DEFAULT_WIDGET_SIZE.height,
    };
  } catch {
    return null;
  }
}

export type PointerHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
};

export function useWidgetPosition(viewport: Size) {
  const [size, setSize] = useState<Size>(() => clampSize(DEFAULT_WIDGET_SIZE));
  const [position, setPosition] = useState<Point | null>(null);

  const sizeRef = useRef(size);
  const positionRef = useRef(position);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { positionRef.current = position; }, [position]);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      const restoredSize = clampSize({ width: stored.width, height: stored.height });
      setSize(restoredSize);
      // The stored position is the LAUNCHER's top-left (56x56) - clamp it against
      // the launcher size, never the restored chat-box size, or a bottom-right
      // position snaps to `viewport - boxSize - margin` on reload.
      setPosition(
        clampPosition(
          { x: stored.x, y: stored.y },
          { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE },
          viewport,
        ),
      );
    } else {
      setPosition(defaultPosition(viewport));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!position) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...position, ...sizeRef.current }));
    } catch {
      // storage unavailable (private mode) - non-fatal
    }
  }, [position, size]);

  // A press records its origin but does NOT capture the pointer. Capture is
  // deferred until the pointer actually moves past DRAG_THRESHOLD, so a plain
  // click (on the launcher, or on the X / "Open full chat" controls inside the
  // box header) is never swallowed by pointer-capture retargeting.
  const pressStart = useRef<{ startPos: Point; startPointer: Point } | null>(null);
  const dragStart = useRef<{ startPos: Point; startPointer: Point } | null>(null);
  const resizeStart = useRef<{ startSize: Size; startPointer: Point } | null>(null);

  const dragHandlers: PointerHandlers = {
    onPointerDown: (e) => {
      pressStart.current = {
        startPos: positionRef.current ?? { x: 0, y: 0 },
        startPointer: { x: e.clientX, y: e.clientY },
      };
    },
    onPointerMove: (e) => {
      if (!pressStart.current) return;
      const delta = {
        x: e.clientX - pressStart.current.startPointer.x,
        y: e.clientY - pressStart.current.startPointer.y,
      };
      if (!dragStart.current) {
        if (Math.hypot(delta.x, delta.y) < DRAG_THRESHOLD) return;
        dragStart.current = pressStart.current;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      setPosition(
        applyDrag(
          dragStart.current.startPos,
          { x: e.clientX - dragStart.current.startPointer.x, y: e.clientY - dragStart.current.startPointer.y },
          // Clamp the LAUNCHER (the stored position), not the box.
          { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE },
          viewport,
        ),
      );
    },
    onPointerUp: () => {
      pressStart.current = null;
      dragStart.current = null;
    },
  };

  const resizeHandlers: PointerHandlers = {
    onPointerDown: (e) => {
      resizeStart.current = { startSize: sizeRef.current, startPointer: { x: e.clientX, y: e.clientY } };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      if (!resizeStart.current) return;
      const delta = { x: e.clientX - resizeStart.current.startPointer.x, y: e.clientY - resizeStart.current.startPointer.y };
      setSize(applyResize(resizeStart.current.startSize, delta));
    },
    onPointerUp: () => { resizeStart.current = null; },
  };

  return { position, size, dragHandlers, resizeHandlers };
}
