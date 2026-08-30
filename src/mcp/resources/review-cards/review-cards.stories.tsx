import type { Meta, StoryObj } from "@storybook/react";
import ReviewCards from "./widget";
import { withMcpWidget } from "../../../../.storybook/withMcpWidget";

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
      body: "Tough but worth it — workload is heavy during finals.",
      tips: "Read the textbook before lectures.",
      rating: 5,
      labels: ["Heavy Workload"],
      voteCount: 3,
      createdAt: "2026-02-01T00:00:00.000Z",
      courseCode: "COR-MGMT1202",
      professorName: "Prof X",
    },
  ],
};

const minimalProps = {
  context: "CS101",
  reviews: [
    {
      id: "rv9",
      body: null,
      tips: null,
      rating: 2,
      labels: [],
      voteCount: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
      courseCode: "CS101",
      professorName: null,
    },
  ],
};

const meta: Meta<typeof ReviewCards> = {
  title: "MCP Apps/Review Cards",
  component: ReviewCards,
  decorators: [withMcpWidget],
  parameters: {},
};

export default meta;
type Story = StoryObj<typeof ReviewCards>;

export const Default: Story = {
  parameters: { mcpWidget: { props: fullProps } },
};

export const Dark: Story = {
  parameters: { mcpWidget: { props: fullProps, theme: "dark" } },
};

export const Minimal: Story = {
  parameters: { mcpWidget: { props: minimalProps } },
};

export const Empty: Story = {
  parameters: { mcpWidget: { props: { context: "CS101", reviews: [] } } },
};

export const Loading: Story = {
  parameters: { mcpWidget: { toolOutput: null } },
};
