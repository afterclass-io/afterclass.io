import { cn } from "@/common/functions";
import { SLOT_ROW_HEIGHT_PX } from "@/modules/meetings/components/grid/grid-layout";
import { assignLanes } from "@/modules/meetings/functions/overlay-lanes";
import { groupSlotsIntoRuns } from "@/modules/meetings/functions/slot-runs";

export type MeetingCalendarOverlay = {
  id: string;
  title: string;
  source: "timetable" | "google";
  slotIndices: number[];
};

const CARD_BASE =
  "border border-(--mt-event) bg-(--mt-busy) text-(--mt-event)";

/**
 * Events are bordered cards that sit beneath the painted availability: they are
 * a guide, and painting always draws on top. Source is told apart by border
 * style: solid for Google Calendar, dashed for the timetable.
 */
export const OVERLAY_SOURCE_STYLES: Record<
  MeetingCalendarOverlay["source"],
  { label: string; block: string; swatch: string }
> = {
  timetable: {
    label: "Timetable",
    block: `${CARD_BASE} border-dashed`,
    swatch: `${CARD_BASE} border-dashed`,
  },
  google: {
    label: "Google Calendar",
    block: CARD_BASE,
    swatch: CARD_BASE,
  },
};

export type MeetingCalendarOverlayLayerProps = {
  overlays: MeetingCalendarOverlay[];
  dayIndex: number;
  slotsPerDay: number;
};

/**
 * Non-interactive event cards for one day column. Cards never capture the
 * pointer, so painting works straight through them.
 */
export function MeetingCalendarOverlayLayer({
  overlays,
  dayIndex,
  slotsPerDay,
}: MeetingCalendarOverlayLayerProps) {
  const blocks = overlays.flatMap((overlay) =>
    groupSlotsIntoRuns(overlay.slotIndices, slotsPerDay)
      .filter((run) => run.dayIndex === dayIndex)
      .map((run) => ({ overlay, run })),
  );
  const lanes = assignLanes(
    blocks.map(({ run }) => ({ startSlot: run.startSlot, length: run.length })),
  );

  return (
    <>
      {blocks.map(({ overlay, run }, index) => {
        const { lane, laneCount } = lanes[index]!;
        return (
          <div
            key={`${overlay.id}:${run.startSlot}`}
            aria-hidden
            data-test="meeting-calendar-overlay"
            className="pointer-events-none absolute z-0 p-px"
            style={{
              top: run.startSlot * SLOT_ROW_HEIGHT_PX,
              height: run.length * SLOT_ROW_HEIGHT_PX,
              left: `${(lane / laneCount) * 100}%`,
              width: `${100 / laneCount}%`,
            }}
          >
            <div
              className={cn(
                "size-full overflow-hidden rounded-sm px-1 pt-px text-[10px] leading-tight font-medium break-words",
                OVERLAY_SOURCE_STYLES[overlay.source].block,
              )}
            >
              {overlay.title}
            </div>
          </div>
        );
      })}
    </>
  );
}
