import type { CSSProperties } from "react";
import { LAUNCHER_SIZE, WIDGET_MARGIN, type Point, type Size } from "../widget-geometry";

export const BUBBLE_GAP = 12;
export const BUBBLE_MAX_WIDTH = 288; // max-w-72
const BUBBLE_EST_HEIGHT = 120; // upper bound incl. padding; decides above vs below

export function bubbleStyle(launcher: Point, viewport: Size): CSSProperties {
  const roomLeft = launcher.x + LAUNCHER_SIZE - BUBBLE_MAX_WIDTH;
  const horizontal: CSSProperties =
    roomLeft >= WIDGET_MARGIN
      ? { right: viewport.width - launcher.x - LAUNCHER_SIZE }
      : { left: launcher.x, maxWidth: viewport.width - launcher.x - WIDGET_MARGIN };
  if (launcher.y >= BUBBLE_EST_HEIGHT + BUBBLE_GAP) {
    return { ...horizontal, bottom: viewport.height - launcher.y + BUBBLE_GAP };
  }
  return { ...horizontal, top: launcher.y + LAUNCHER_SIZE + BUBBLE_GAP };
}
