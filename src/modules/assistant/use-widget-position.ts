"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyDrag, applyResize, clampSize, DEFAULT_WIDGET_SIZE,
  defaultPosition, fromOffsets, LAUNCHER_SIZE, toOffsets,
  type LauncherOffsets, type Point, type Size,
} from "./widget-geometry";

const STORAGE_KEY = "assistant-widget-geometry:v3";

const DRAG_THRESHOLD = 4; // px of pointer movement before a press becomes a drag

type StoredV3 = { right: number; bottom: number; width: number; height: number };

function loadStored(): StoredV3 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredV3>;
    if (typeof parsed.right !== "number" || typeof parsed.bottom !== "number") return null;
    return {
      right: parsed.right, bottom: parsed.bottom,
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
  const offsetsRef = useRef<LauncherOffsets | null>(null);
  const initialisedRef = useRef(false);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { positionRef.current = position; }, [position]);

  // Initialise once from storage onto the current viewport; ignore legacy v2 shape.
  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      const restoredSize = clampSize({ width: stored.width, height: stored.height });
      setSize(restoredSize);
      // Persisted offsets are the user's intended (unclamped) offsets — clamp only for display.
      // fromOffsets will clamp the derived position on-screen; we never overwrite the stored offsets.
      const off: LauncherOffsets = { right: stored.right, bottom: stored.bottom };
      offsetsRef.current = off;
      setPosition(fromOffsets(off, viewport));
    } else {
      const def = defaultPosition(viewport);
      offsetsRef.current = toOffsets(def, viewport);
      setPosition(def);
    }
    initialisedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with the current viewport
  }, []);

  // Re-anchor on viewport resize so the launcher stays the same distance from bottom-right.
  // Persisted offsets are the source of truth and are never overwritten with clamped display values.
  // Display position is derived via fromOffsets (which clamps on-screen); stale closure avoided
  // via functional setPosition and offsetsRef, so viewport alone drives updates.
  useEffect(() => {
    if (!initialisedRef.current) return;
    if (!offsetsRef.current) return;
    // Derive display position from the user's intended (unclamped) offsets — do not
    // write clamped offsets back. fromOffsets clamps only the rendered position.
    const next = fromOffsets(offsetsRef.current, viewport);
    setPosition((prev) => {
      if (next.x !== prev?.x || next.y !== prev?.y) return next;
      return prev;
    });
    // viewport is the only reactive dep; offsetsRef/position use functional form/refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps: viewport only; position handled via functional setState
  }, [viewport.width, viewport.height]);

  useEffect(() => {
    if (!position || !offsetsRef.current) return;
    try {
      const toStore: StoredV3 = { right: offsetsRef.current.right, bottom: offsetsRef.current.bottom, ...sizeRef.current };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
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
      const next = applyDrag(
        dragStart.current.startPos,
        { x: e.clientX - dragStart.current.startPointer.x, y: e.clientY - dragStart.current.startPointer.y },
        // Clamp the LAUNCHER (the stored position), not the box.
        { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE },
        viewport,
      );
      offsetsRef.current = toOffsets(next, viewport);
      setPosition(next);
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
