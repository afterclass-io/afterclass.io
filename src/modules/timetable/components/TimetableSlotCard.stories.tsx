import type { Meta, StoryObj } from "@storybook/react";
import { TimetableSlotCard } from "./TimetableSlotCard";
import type { PositionedSlot } from "@/modules/timetable/functions/slot-math";

const baseSlot: PositionedSlot = {
  timing: {
    dayOfWeek: "MON",
    startTime: "10:00",
    endTime: "12:00",
    venue: "SOE-SR2-1",
  },
  topPct: 14.2857,
  heightPct: 14.2857,
  colIndex: 0,
  colCount: 1,
};

const meta: Meta<typeof TimetableSlotCard> = {
  title: "Timetable/TimetableSlotCard",
  component: TimetableSlotCard,
  tags: ["autodocs"],
  args: {
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    section: "G1",
    professorName: "Dr. Jane Doe",
    venue: "SOE-SR2-1",
    slot: baseSlot,
    highlightNow: false,
    readOnly: false,
  },
  decorators: [
    (Story) => (
      <div
        className="relative"
        style={{ width: 300, height: 400, border: "1px solid #e5e7eb" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Highlighted: Story = {
  args: {
    highlightNow: true,
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
};

export const NoVenue: Story = {
  args: {
    venue: null,
  },
};

export const OverlappedColumn: Story = {
  args: {
    slot: {
      ...baseSlot,
      colIndex: 1,
      colCount: 2,
    },
  },
  decorators: [
    (Story) => (
      <div
        className="relative"
        style={{ width: 300, height: 400, border: "1px solid #e5e7eb" }}
      >
        {/* First card (colIndex 0) */}
        <TimetableSlotCard
          courseCode="CS101"
          courseName="Intro to CS"
          section="G1"
          venue="SOE-SR2-1"
          slot={{ ...baseSlot, colIndex: 0, colCount: 2 }}
        />
        <Story />
      </div>
    ),
  ],
};

export const ShortSlot: Story = {
  args: {
    slot: {
      ...baseSlot,
      heightPct: 7.1428, // 1 hour
    },
  },
};

export const EarlyMorning: Story = {
  args: {
    slot: {
      ...baseSlot,
      topPct: 0,
      heightPct: 14.2857,
      timing: {
        dayOfWeek: "MON",
        startTime: "08:00",
        endTime: "10:00",
        venue: "SOE-SR2-1",
      },
    },
  },
};
