import type { Meta, StoryObj } from "@storybook/react";
import CourseSearch from "./widget";
import { withMcpWidget } from "../../../../.storybook/withMcpWidget";

const sampleResults = {
  results: [
    {
      id: "c1",
      code: "ACC101",
      name: "Financial Accounting",
      creditUnits: 3,
      sections: [
        {
          classId: "cl1",
          section: "G1",
          professorName: "Prof Lim",
          timings: [
            { dayOfWeek: "MON", startTime: "10:00", endTime: "12:00", venue: "SR 3-1" },
          ],
        },
        { classId: "cl2", section: "G2", professorName: null, timings: [] },
      ],
    },
    { id: "c2", code: "ACC102", name: "Managerial Accounting", creditUnits: 3, sections: [] },
    { id: "c3", code: "COR-STAT1202", name: "Intro Statistics", creditUnits: 1, sections: [] },
  ],
};

const meta: Meta<typeof CourseSearch> = {
  title: "MCP Apps/Course Search",
  component: CourseSearch,
  decorators: [withMcpWidget],
  parameters: {
    mcpWidget: { props: sampleResults },
  },
};

export default meta;
type Story = StoryObj<typeof CourseSearch>;

export const Default: Story = {};

export const Dark: Story = {
  parameters: { mcpWidget: { props: sampleResults, theme: "dark" } },
};

export const Loading: Story = {
  parameters: { mcpWidget: { toolOutput: null } },
};

export const NoResults: Story = {
  parameters: { mcpWidget: { props: { results: [] } } },
};
