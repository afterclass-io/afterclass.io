"use client";

import { useEffect, useState, type RefObject } from "react";

import { formatDateSGT } from "@/common/functions/format-date-sgt";
import type { MeetingParticipantData } from "@/modules/meetings/components/grid/MeetingHeatmapCell";
import {
  getSlotBreakdown,
  type SlotTally,
} from "@/modules/meetings/functions/slot-tally";

export type HeatmapHoverCardProps = {
  /** Grid element that contains cells carrying `data-slot-index`. */
  containerRef: RefObject<HTMLElement | null>;
  participants: MeetingParticipantData[];
  tally: ReadonlyMap<number, SlotTally>;
  hideIfNeeded: boolean;
  /** Date and time label parts for a slot index. */
  describeSlot: (slot: number) => { date: Date; timeStr: string };
};

type Hover = { slot: number; rect: DOMRect };

const CARD_WIDTH_PX = 288;
const EDGE_MARGIN_PX = 8;

function NameList({
  label,
  names,
  dotClass,
  labelClass,
}: {
  label: string;
  names: string[];
  dotClass: string;
  labelClass: string;
}) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 font-medium ${labelClass}`}>
        <span className={`size-2 rounded-full ${dotClass}`} />
        <span>
          {label} ({names.length})
        </span>
      </div>
      {names.length > 0 ? (
        <p className="text-muted-foreground mt-0.5 pl-3.5 leading-tight">
          {names.join(", ")}
        </p>
      ) : (
        <p className="text-muted-foreground/60 mt-0.5 pl-3.5 italic">None</p>
      )}
    </div>
  );
}

/**
 * One hover card shared by every heatmap cell. It follows the pointer through
 * event delegation on the grid, so hovering never re-renders the grid itself.
 */
export function HeatmapHoverCard({
  containerRef,
  participants,
  tally,
  hideIfNeeded,
  describeSlot,
}: HeatmapHoverCardProps) {
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onOver = (event: PointerEvent) => {
      const cell = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-slot-index]",
      );
      const slot = Number(cell?.dataset.slotIndex);
      setHover((current) => {
        if (!cell || !Number.isInteger(slot)) return null;
        if (current?.slot === slot) return current;
        return { slot, rect: cell.getBoundingClientRect() };
      });
    };
    const clear = () => setHover(null);

    container.addEventListener("pointerover", onOver);
    container.addEventListener("pointerleave", clear);
    container.addEventListener("scroll", clear, { passive: true });
    return () => {
      container.removeEventListener("pointerover", onOver);
      container.removeEventListener("pointerleave", clear);
      container.removeEventListener("scroll", clear);
    };
  }, [containerRef]);

  if (!hover) return null;

  const { available, ifNeeded, unavailable } = getSlotBreakdown(
    tally,
    hover.slot,
    participants,
  );
  const { date, timeStr } = describeSlot(hover.slot);
  const left = Math.min(
    Math.max(
      hover.rect.left + hover.rect.width / 2 - CARD_WIDTH_PX / 2,
      EDGE_MARGIN_PX,
    ),
    window.innerWidth - CARD_WIDTH_PX - EDGE_MARGIN_PX,
  );

  return (
    <div
      role="tooltip"
      className="bg-popover text-popover-foreground pointer-events-none fixed z-50 space-y-2.5 rounded-md border p-3 text-xs shadow-md"
      style={{
        left,
        top: hover.rect.top - EDGE_MARGIN_PX,
        width: CARD_WIDTH_PX,
        transform: "translateY(-100%)",
      }}
    >
      <div className="border-b pb-1.5">
        <p className="text-foreground font-semibold">
          {formatDateSGT(date, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}{" "}
          • {timeStr}
        </p>
        <p className="text-muted-foreground text-[11px]">
          {available.length} of {participants.length} available
          {ifNeeded.length > 0 && ` (${ifNeeded.length} if needed)`}
        </p>
      </div>
      <NameList
        label="Available"
        names={available}
        dotClass="bg-(--mt-available)"
        labelClass="text-(--mt-available)"
      />
      {!hideIfNeeded && (
        <NameList
          label="If needed"
          names={ifNeeded}
          dotClass="border border-(--mt-if-needed-line) bg-(--mt-if-needed)"
          labelClass="text-(--mt-if-needed-line)"
        />
      )}
      <NameList
        label="Unavailable"
        names={unavailable}
        dotClass="bg-muted-foreground/40"
        labelClass="text-muted-foreground"
      />
    </div>
  );
}
