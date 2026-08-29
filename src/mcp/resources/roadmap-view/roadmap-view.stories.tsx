import type { Meta, StoryObj } from "@storybook/react";
import RoadmapView from "./widget";
import { withMcpWidget } from "../../../../.storybook/withMcpWidget";

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

const meta: Meta<typeof RoadmapView> = {
  title: "MCP Apps/Roadmap View",
  component: RoadmapView,
  decorators: [withMcpWidget],
  parameters: {},
};

export default meta;
type Story = StoryObj<typeof RoadmapView>;

export const Public: Story = {
  parameters: { mcpWidget: { props: publicProps } },
};

export const Private: Story = {
  parameters: {
    mcpWidget: {
      props: { ...publicProps, isPublic: false, owner: null, voteCount: null },
    },
  },
};

export const Dark: Story = {
  parameters: { mcpWidget: { props: publicProps, theme: "dark" } },
};

export const Empty: Story = {
  parameters: {
    mcpWidget: {
      props: { ...publicProps, isPublic: false, owner: null, voteCount: null, entries: [] },
    },
  },
};

export const Loading: Story = {
  parameters: { mcpWidget: { toolOutput: null } },
};
