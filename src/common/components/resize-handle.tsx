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
        "hover:bg-primary/20 hidden w-1 shrink-0 cursor-col-resize touch-none items-center justify-center transition-colors lg:flex",
        className,
      )}
      onPointerDown={onPointerDown}
    >
      <div className="bg-border group-hover:bg-primary/50 h-8 w-0.5 rounded-full" />
    </div>
  );
}
