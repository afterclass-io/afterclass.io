export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export const WIDGET_MARGIN = 8;
// The launcher button is `size-14` (56x56) - see assistant-widget.tsx.
export const LAUNCHER_SIZE = 56;
export const MIN_WIDGET_SIZE: Size = { width: 320, height: 420 };
export const MAX_WIDGET_SIZE: Size = { width: 720, height: 900 };
export const DEFAULT_WIDGET_SIZE: Size = { width: 400, height: 560 };
// Expanded mode (OpenClaw-style): a larger reading surface one click away.
// Capped by clampSize to the viewport, so small screens just get "as big as
// fits" instead of overflowing.
export const EXPANDED_WIDGET_SIZE: Size = { width: 640, height: 760 };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampPosition(pos: Point, size: Size, viewport: Size): Point {
  return {
    x: clamp(
      pos.x,
      WIDGET_MARGIN,
      Math.max(WIDGET_MARGIN, viewport.width - size.width - WIDGET_MARGIN),
    ),
    y: clamp(
      pos.y,
      WIDGET_MARGIN,
      Math.max(WIDGET_MARGIN, viewport.height - size.height - WIDGET_MARGIN),
    ),
  };
}

export function clampSize(size: Size, viewport?: Size): Size {
  // Without a viewport the fixed bounds apply (initial state, tests). With
  // one, the max also respects the visible area so the box can never resize
  // larger than the screen — on a 360px phone the fixed 720px MAX would
  // otherwise overflow the viewport.
  const maxWidth = viewport
    ? Math.min(MAX_WIDGET_SIZE.width, viewport.width - WIDGET_MARGIN * 2)
    : MAX_WIDGET_SIZE.width;
  const maxHeight = viewport
    ? Math.min(MAX_WIDGET_SIZE.height, viewport.height - WIDGET_MARGIN * 2)
    : MAX_WIDGET_SIZE.height;
  return {
    width: clamp(
      size.width,
      MIN_WIDGET_SIZE.width,
      Math.max(maxWidth, MIN_WIDGET_SIZE.width),
    ),
    height: clamp(
      size.height,
      MIN_WIDGET_SIZE.height,
      Math.max(maxHeight, MIN_WIDGET_SIZE.height),
    ),
  };
}

// The stored position is the LAUNCHER's top-left. Anchor it to the bottom-right
// corner of the viewport (the launcher is 56x56, so this is bottom-right).
export function defaultPosition(viewport: Size): Point {
  return clampPosition(
    {
      x: viewport.width - LAUNCHER_SIZE - 16,
      y: viewport.height - LAUNCHER_SIZE - 16,
    },
    { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE },
    viewport,
  );
}

/**
 * Chat-box top-left such that the box's bottom-right corner sits at the
 * launcher's bottom-right corner (the box "opens out of" the launcher),
 * clamped so the box never leaves the viewport.
 */
export function boxPositionFromLauncher(
  launcher: Point,
  size: Size,
  viewport: Size,
): Point {
  return clampPosition(
    {
      x: launcher.x + LAUNCHER_SIZE - size.width,
      y: launcher.y + LAUNCHER_SIZE - size.height,
    },
    size,
    viewport,
  );
}

// Launcher offsets from viewport bottom-right (right = vw - x - LAUNCHER_SIZE, same for bottom)
export type LauncherOffsets = { right: number; bottom: number };

export function toOffsets(pos: Point, viewport: Size): LauncherOffsets {
  return {
    right: viewport.width - pos.x - LAUNCHER_SIZE,
    bottom: viewport.height - pos.y - LAUNCHER_SIZE,
  };
}

export function fromOffsets(
  offsets: LauncherOffsets,
  viewport: Size,
  launcherSize: Size = { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE },
): Point {
  const raw: Point = {
    x: viewport.width - offsets.right - LAUNCHER_SIZE,
    y: viewport.height - offsets.bottom - LAUNCHER_SIZE,
  };
  return clampPosition(raw, launcherSize, viewport);
}

export function clampOffsets(
  offsets: LauncherOffsets,
  viewport: Size,
): LauncherOffsets {
  const pos = fromOffsets(offsets, viewport);
  return toOffsets(pos, viewport);
}

export function applyDrag(
  start: Point,
  delta: Point,
  size: Size,
  viewport: Size,
): Point {
  return clampPosition(
    { x: start.x + delta.x, y: start.y + delta.y },
    size,
    viewport,
  );
}

export function applyResize(start: Size, delta: Point, viewport?: Size): Size {
  return clampSize(
    {
      width: start.width + delta.x,
      height: start.height + delta.y,
    },
    viewport,
  );
}
