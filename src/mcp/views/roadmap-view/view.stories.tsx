import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../../../.storybook/withMcpView";

/**
 * Stories for the roadmap-view View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

const publicProps = {
  roadmapId: "r1",
  name: "BSc IS (Community)",
  isPublic: true,
  owner: "senior123",
  voteCount: 42,
  entries: [
    { yearNumber: 1, term: "T1", courseCode: "CS101", courseName: "Intro to CS", creditUnits: 1 },
    { yearNumber: 1, term: "T2", courseCode: "CS102", courseName: "Data Structures", creditUnits: 1 },
    { yearNumber: 2, term: "T1", courseCode: "CS201", courseName: "Algorithms", creditUnits: 1 },
  ],
};

const privateProps = {
  roadmapId: "r2",
  name: "My Plan",
  isPublic: false,
  owner: null,
  voteCount: null,
  entries: publicProps.entries,
};

const meta: Meta<typeof View> = {
  title: "MCP Views/roadmap-view",
  component: View,
};

export default meta;
type Story = StoryObj<typeof View>;

export const Default: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: publicProps })],
};

export const Dark: Story = {
  decorators: [
    withMcpView({ status: "ready", toolOutput: publicProps, theme: "dark" }),
  ],
};

export const Private: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: privateProps })],
};

export const Loading: Story = {
  decorators: [withMcpView({ status: "pending" })],
};

export const ErrorState: Story = {
  decorators: [
    withMcpView({ status: "error", error: { message: "Unauthorized" } }),
  ],
};
