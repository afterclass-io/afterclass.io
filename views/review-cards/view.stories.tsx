import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../.storybook/withMcpView";

/**
 * Stories for the review-cards View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

const fullProps = {
  context: "COR-MGMT1202",
  reviews: [
    {
      id: "rv1",
      body: "Heavy group work but fair grading.",
      tips: "Start the project early.",
      rating: 4,
      labels: ["Group Work", "Fair"],
      voteCount: 12,
      createdAt: "2026-01-15T00:00:00.000Z",
      courseCode: "COR-MGMT1202",
      professorName: "Prof X",
    },
    {
      id: "rv2",
      body: "Tough curve.",
      tips: null,
      rating: 2,
      labels: [],
      voteCount: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
      courseCode: "COR-MGMT1202",
      professorName: null,
    },
  ],
};

const meta: Meta<typeof View> = {
  title: "MCP Views/review-cards",
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

export const NoReviews: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolOutput: { context: "CS101", reviews: [] },
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
