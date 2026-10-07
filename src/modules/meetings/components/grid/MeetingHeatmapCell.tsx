"use client";

import { cn } from "@/common/functions";

export type MeetingParticipantData = {
  participantId: string;
  name: string;
  availableSlots: number[];
  ifNeededSlots: number[];
  isCurrentUser?: boolean;
};

export type MeetingHeatmapCellProps = Omit<
  React.ComponentProps<"button">,
  "style" | "children"
> & {
  slotIndex: number;
  /** Background colour for this cell's availability ratio. */
  backgroundColor: string;
};

/**
 * One heatmap cell. Deliberately a plain button: the grid renders hundreds of
 * them, so hover details come from the single shared `HeatmapHoverCard`.
 * Pointer and keyboard handlers are supplied by the grid for range selection.
 */
export function MeetingHeatmapCell({
  slotIndex,
  backgroundColor,
  className,
  ...buttonProps
}: MeetingHeatmapCellProps) {
  return (
    <button
      type="button"
      {...buttonProps}
      data-slot-index={slotIndex}
      data-test={`heatmap-cell-${slotIndex}`}
      className={cn(
        "relative size-full cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-hidden",
        className,
      )}
      style={{ backgroundColor }}
    />
  );
}
