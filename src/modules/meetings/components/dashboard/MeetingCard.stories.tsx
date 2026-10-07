import type { Meta, StoryObj } from "@storybook/nextjs";

import { MeetingCard } from "./MeetingCard";

const meta = {
  title: "Meetings/MeetingCard",
  component: MeetingCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    meeting: {
      slug: "xK9mP2vL7q",
      title: "IS215 Group Project Sync",
      description: "Coordination for Sprint 1 milestones and deliverables.",
      startDate: "2026-10-12T00:00:00Z",
      endDate: "2026-10-16T00:00:00Z",
      startHour: 8,
      endHour: 22,
      participantCount: 2,
      course: { code: "IS215" },
      section: "G1",
      teamIdentifier: "Team 3",
    },
  },
} satisfies Meta<typeof MeetingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithClassAndTeam: Story = {};

export const WithoutClass: Story = {
  args: {
    meeting: {
      slug: "vN8wQ3zR5k",
      title: "Study group catch-up",
      startDate: "2026-10-19T00:00:00Z",
      endDate: "2026-10-19T00:00:00Z",
      startHour: 9,
      endHour: 18,
      participantCount: 1,
    },
  },
};

export const LongTitle: Story = {
  args: {
    meeting: {
      slug: "lT7kR2pQ9x",
      title:
        "IS215 Digital Business Technologies and Transformation final presentation dry run",
      startDate: "2026-10-30T00:00:00Z",
      endDate: "2026-11-02T00:00:00Z",
      startHour: 8,
      endHour: 22,
      participantCount: 12,
      course: { code: "IS215" },
      section: "G1",
    },
  },
};
