import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../.storybook/withMcpView";

/**
 * Stories for the timetable View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

const fullProps = {
  timetableId: "tt1",
  name: "My Timetable",
  isActive: true,
  termId: "AY202627T1",
  slots: [
    {
      classId: "c1",
      courseCode: "ACCT102",
      courseName: "Management Accounting",
      section: "G1",
      day: "Mon",
      startTime: "08:15",
      endTime: "11:30",
      venue: "SOE/SR3-1",
      professor: "FANG Bingxu",
      creditUnits: 4,
    },
    {
      classId: "c1",
      courseCode: "ACCT102",
      courseName: "Management Accounting",
      section: "G1",
      day: "Wed",
      startTime: "08:15",
      endTime: "11:30",
      venue: "SOE/SR3-1",
      professor: "FANG Bingxu",
      creditUnits: 4,
    },
    {
      classId: "c2",
      courseCode: "COR-IS1702",
      courseName: "Computational Thinking",
      section: "G2",
      day: "Mon",
      startTime: "09:00",
      endTime: "10:00",
      venue: "SIS/SR2-3",
      professor: null,
      creditUnits: 4,
    },
    {
      classId: "c3",
      courseCode: "STAT203",
      courseName: "Financial Mathematics",
      section: "G5",
      day: "Tue",
      startTime: "12:00",
      endTime: "15:15",
      venue: null,
      professor: "Yixin CAO",
      creditUnits: 4,
    },
  ],
  examTimings: [],
};

const emptyProps = {
  ...fullProps,
  slots: [],
};

const meta: Meta<typeof View> = {
  title: "MCP Views/timetable",
  component: View,
};

export default meta;
type Story = StoryObj<typeof View>;

export const Default: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: fullProps })],
};

export const Dark: Story = {
  decorators: [
    withMcpView({ status: "ready", toolOutput: fullProps, theme: "dark" }),
  ],
};

export const Empty: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: emptyProps })],
};

/**
 * Clash: ACCT102 G1 (Mon 08:15–11:30) overlaps COR-IS1702 G2
 * (Mon 09:00–10:00) — the two Monday blocks stack side-by-side
 * (data-overlap-count=2, half width) instead of fully overlapping.
 */
export const Clash: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: fullProps })],
};

export const Exams: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolOutput: {
        ...fullProps,
        examTimings: [
          {
            classId: "c1",
            courseCode: "ACCT102",
            section: "G1",
            date: "2026-04-20T00:00:00.000Z",
            dayOfWeek: "Mon",
            startTime: "09:00",
            endTime: "11:00",
            venue: "MPSH 1",
          },
          {
            classId: "c2",
            courseCode: "COR-IS1702",
            section: "G2",
            date: "2026-04-24T00:00:00.000Z",
            dayOfWeek: "Fri",
            startTime: "14:00",
            endTime: "16:00",
            venue: "MPSH 2",
          },
        ],
      },
    }),
  ],
};

export const Loading: Story = {
  decorators: [withMcpView({ status: "pending" })],
};

export const ErrorState: Story = {
  decorators: [
    withMcpView({ status: "error", error: { message: "Unauthorized" } }),
  ],
};
