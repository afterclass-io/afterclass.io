"use client";

import { useEffect } from "react";

import { Kbd } from "@/common/components/kbd";
import { cn } from "@/common/functions";

export type AvailabilityBrushMode = "AVAILABLE" | "IF_NEEDED" | "UNAVAILABLE";

export type MeetingAvailabilityBrushProps = {
  activeMode: AvailabilityBrushMode;
  onChange: (mode: AvailabilityBrushMode) => void;
  className?: string;
  disabled?: boolean;
};

interface BrushOption {
  mode: AvailabilityBrushMode;
  label: string;
  hint: string;
  swatchClass: string;
}

/** The legend doubles as the brush picker, so the colours explain themselves. */
export const BRUSH_OPTIONS: BrushOption[] = [
  {
    mode: "AVAILABLE",
    label: "Available",
    hint: "Free for the meeting",
    swatchClass: "bg-(--mt-available-soft) border-(--mt-available)",
  },
  {
    mode: "IF_NEEDED",
    label: "If needed",
    hint: "Only if no better time",
    swatchClass: "bg-(--mt-if-needed) border-(--mt-if-needed-line)",
  },
  {
    mode: "UNAVAILABLE",
    label: "Unavailable",
    hint: "Erase a slot",
    swatchClass: "bg-background border-border",
  },
];

/**
 * Legend and brush selector in one: pick Available, If needed or Unavailable,
 * then paint the grid. Keys [1], [2], [3] switch brushes.
 */
export function MeetingAvailabilityBrush({
  activeMode,
  onChange,
  className,
  disabled = false,
}: MeetingAvailabilityBrushProps) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      const option = BRUSH_OPTIONS[Number(e.key) - 1];
      if (option) {
        // A button focused by an earlier click would keep its focus ring
        // alongside the newly chosen brush.
        if (target?.closest('[role="radiogroup"]')) target.blur();
        onChange(option.mode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, onChange]);

  return (
    <div
      className={cn("space-y-1.5", className)}
      data-test="meeting-brush-group"
    >
      <p className="text-muted-foreground text-xs font-medium">
        Choose a colour, then click or drag on the grid
      </p>
      <div role="radiogroup" aria-label="Availability brush" className="space-y-1">
        {BRUSH_OPTIONS.map((option, index) => {
          const isActive = activeMode === option.mode;

          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              onClick={() => onChange(option.mode)}
              data-test={`meeting-brush-${option.mode.toLowerCase()}`}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                isActive
                  ? "border-primary bg-primary/5 ring-primary/30 ring-2"
                  : "hover:bg-muted/60 border-transparent",
              )}
            >
              <span
                className={cn("size-4 shrink-0 rounded-sm border", option.swatchClass)}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{option.label}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {option.hint}
                </span>
              </span>
              <Kbd variant="outline" className="text-[10px] text-muted-foreground/70">
                {index + 1}
              </Kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}
