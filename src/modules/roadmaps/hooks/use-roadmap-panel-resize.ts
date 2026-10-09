"use client";

import { useCallback, useRef } from "react";
import { useAtom } from "jotai";
import { roadmapPanelWidthsAtom } from "@/modules/roadmaps/atoms/roadmap";

/** Panel resize clamps (px). lg+ only; mobile keeps the stacked layout. */
const LIST_MIN_WIDTH = 160;
const LIST_MAX_WIDTH = 320;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 400;
/** Keep at least this much width for the grid/timeline area when resizing. */
const MAIN_MIN_WIDTH = 480;

function clampWidth(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Resizable roadmap panels (persisted, lg+ only). Attach `layoutRef` to the
 * container so the drag handlers can keep the main area at its minimum width.
 */
export function useRoadmapPanelResize() {
  const [panelWidths, setPanelWidths] = useAtom(roadmapPanelWidthsAtom);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const handleListResize = useCallback(
    (deltaX: number) => {
      setPanelWidths((w) => {
        const containerW = layoutRef.current?.clientWidth ?? Infinity;
        const max = Math.min(
          LIST_MAX_WIDTH,
          containerW - w.sidebar - MAIN_MIN_WIDTH,
        );
        return { ...w, list: clampWidth(w.list + deltaX, LIST_MIN_WIDTH, max) };
      });
    },
    [setPanelWidths],
  );

  const handleSidebarResize = useCallback(
    (deltaX: number) => {
      setPanelWidths((w) => {
        const containerW = layoutRef.current?.clientWidth ?? Infinity;
        const max = Math.min(
          SIDEBAR_MAX_WIDTH,
          containerW - w.list - MAIN_MIN_WIDTH,
        );
        // The handle sits left of the sidebar: dragging left widens it.
        return {
          ...w,
          sidebar: clampWidth(w.sidebar - deltaX, SIDEBAR_MIN_WIDTH, max),
        };
      });
    },
    [setPanelWidths],
  );

  return { panelWidths, layoutRef, handleListResize, handleSidebarResize };
}
