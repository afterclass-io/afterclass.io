import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import {
  MeetingAvailabilityBrush,
  type AvailabilityBrushMode,
} from "./MeetingAvailabilityBrush";
import type { MeetingCalendarOverlay } from "./MeetingCalendarOverlayLayer";
import type { MeetingParticipantData } from "./MeetingHeatmapCell";
import { MeetingMatrixGrid } from "./MeetingMatrixGrid";
import type { SlotRange } from "@/modules/meetings/functions/slot-runs";

const MOCK_PARTICIPANTS: MeetingParticipantData[] = [
  {
    participantId: "part-1",
    name: "Jordan Teo",
    availableSlots: [8, 9, 10, 11, 16, 17, 18, 19, 64, 65, 66, 67],
    ifNeededSlots: [12, 13, 20, 21, 68, 69],
    isCurrentUser: true,
  },
  {
    participantId: "part-2",
    name: "Alice Tan",
    availableSlots: [8, 9, 10, 11, 16, 17, 18, 19, 70, 71, 72, 73],
    ifNeededSlots: [14, 15, 22, 23],
    isCurrentUser: false,
  },
  {
    participantId: "part-3",
    name: "Ben Lim",
    availableSlots: [8, 9, 10, 11, 16, 17, 24, 25, 64, 65, 66],
    ifNeededSlots: [18, 19, 26, 27],
    isCurrentUser: false,
  },
  {
    participantId: "part-4",
    name: "Chloe Ong",
    availableSlots: [8, 9, 10, 11, 64, 65, 66, 67, 120, 121, 122],
    ifNeededSlots: [16, 17, 18, 19],
    isCurrentUser: false,
  },
];

// 56 slots per day (08:00-22:00): slot 8 = Mon 10:00, slot 64 = Tue 10:00
const MOCK_OVERLAYS: MeetingCalendarOverlay[] = [
  {
    id: "timetable-0",
    title: "IS215 G1",
    source: "timetable",
    slotIndices: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  },
  {
    id: "timetable-1",
    title: "IS216 G2",
    source: "timetable",
    slotIndices: [72, 73, 74, 75, 76, 77, 78, 79],
  },
  {
    id: "google-0",
    title: "Dentist appointment",
    source: "google",
    slotIndices: [4, 5, 6, 7],
  },
];

const meta = {
  title: "Meetings/MeetingMatrixGrid",
  component: MeetingMatrixGrid,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    startDate: "2026-10-12",
    endDate: "2026-10-16",
    startHour: 8,
    endHour: 22,
    slotMinutes: 15,
  },
} satisfies Meta<typeof MeetingMatrixGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

function Painter(props: Parameters<typeof MeetingMatrixGrid>[0]) {
  const [brush, setBrush] = useState<AvailabilityBrushMode>("AVAILABLE");
  const [slots, setSlots] = useState({
    availableSlots: props.availableSlots ?? [],
    ifNeededSlots: props.ifNeededSlots ?? [],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <MeetingAvailabilityBrush activeMode={brush} onChange={setBrush} />
      <MeetingMatrixGrid
        {...props}
        brushMode={brush}
        availableSlots={slots.availableSlots}
        ifNeededSlots={slots.ifNeededSlots}
        onAvailabilityChange={setSlots}
      />
    </div>
  );
}

/** Empty painter: pick a brush, then click or drag to mark slots. */
export const DefaultEmptyPainter: Story = {
  render: (args) => <Painter {...args} />,
};

/** Pre-filled availability that can still be edited. */
export const PrePopulatedUserAvailability: Story = {
  args: {
    availableSlots: [8, 9, 10, 11, 16, 17, 18, 19, 64, 65, 66, 67],
    ifNeededSlots: [12, 13, 20, 21, 68, 69],
  },
  render: (args) => <Painter {...args} />,
};

/**
 * The viewer's timetable and Google Calendar events as hatched, non-interactive
 * blocks behind the painter. Painting works straight through them.
 */
export const WithCalendarOverlays: Story = {
  args: { overlays: MOCK_OVERLAYS },
  render: (args) => <Painter {...args} />,
};

/** Group heatmap; hover a cell to see who is free. */
export const GroupHeatmapView: Story = {
  args: {
    viewMode: "heatmap",
    participants: MOCK_PARTICIPANTS,
  },
};

/** Click or drag within one day column to select a time range. */
export const GroupRangeSelection: Story = {
  args: {
    viewMode: "heatmap",
    participants: MOCK_PARTICIPANTS,
  },
  render: function Render(args) {
    const [range, setRange] = useState<SlotRange | null>({ start: 8, end: 11 });

    return (
      <div className="mx-auto max-w-4xl space-y-3">
        <p className="text-muted-foreground text-xs">
          {range
            ? `Selected slots ${range.start}-${range.end}`
            : "Click or drag to select a time"}
        </p>
        <MeetingMatrixGrid
          {...args}
          selectedRange={range}
          onSelectRange={setRange}
        />
      </div>
    );
  },
};

/** Read-only grid: no painting handlers are attached. */
export const ReadOnly: Story = {
  args: {
    readOnly: true,
    availableSlots: [8, 9, 10, 11, 16, 17],
  },
};
