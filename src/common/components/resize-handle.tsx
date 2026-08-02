"use client";
import { useCallback } from "react";
import { cn } from "@/common/functions";

interface ResizeHandleProps {
  /** Called with the incremental horizontal pointer delta (px) while dragging. */
  onDelta: (deltaX: number) => void;
  className?: string;
  /** Accessible label for the separator (rendered as aria-label). */
  label?: string;
}

export function ResizeHandle({ onDelta, className, label }: ResizeHandleProps) {
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      let lastX = e.clientX;
      const onMove = (ev: PointerEvent) => {
        onDelta(ev.clientX - lastX);
        lastX = ev.clientX;
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [onDelta],
  );
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      className={cn(
        "hidden lg:flex w-1 cursor-col-resize touch-none shrink-0 items-center justify-center hover:bg-primary/20 transition-colors",
        className,
      )}
      onPointerDown={onPointerDown}
    >
      <div className="h-8 w-0.5 rounded-full bg-border group-hover:bg-primary/50" />
    </div>
  );
}
