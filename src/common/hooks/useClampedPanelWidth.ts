"use client";
import { useAtom } from "jotai";
import type { CSSProperties } from "react";
import type { SetStateAction, WritableAtom } from "jotai";

export function useClampedPanelWidth<T extends number>(
  atom: WritableAtom<T, [SetStateAction<T>], void>,
  min: number,
  max: number,
) {
  const [width, setWidth] = useAtom(atom);
  return {
    width,
    clamp: (deltaX: number) =>
      // Functional update: apply the incremental drag delta to the LATEST
      // width. ResizeHandle keeps its original pointermove closure for the
      // whole drag, so reading the render-scope `width` here would replay
      // every delta against the drag-start width — the panel jitters
      // (stretches, then shrinks) instead of accumulating the drag distance.
      setWidth((prev) => Math.max(min, Math.min(max, prev + deltaX)) as T),
    style: { "--panel-width": `${width}px` } as CSSProperties,
  };
}
