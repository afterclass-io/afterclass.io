import type { Meta, StoryObj } from "@storybook/react";
import BidPlan from "./widget";
import { withMcpWidget } from "../../../../.storybook/withMcpWidget";

const fullProps = {
  acadTermId: "AY2026/27-T1",
  budget: { balance: 987.5 },
  bids: [
    {
      id: "b1",
      bidAmount: 25,
      status: "PLANNED",
      courseCode: "ACC101",
      courseName: "Financial Accounting",
      section: "G1",
      professorName: "Prof X",
      round: "1",
      window: 1,
    },
    {
      id: "b2",
      bidAmount: 51,
      status: "SECURED",
      courseCode: "FIN201",
      courseName: "Finance",
      section: "G3",
      professorName: null,
      round: "1A",
      window: 2,
    },
  ],
};

const meta: Meta<typeof BidPlan> = {
  title: "MCP Apps/Bid Plan",
  component: BidPlan,
  decorators: [withMcpWidget],
  parameters: {},
};

export default meta;
type Story = StoryObj<typeof BidPlan>;

export const Default: Story = {
  parameters: { mcpWidget: { props: fullProps } },
};

export const Dark: Story = {
  parameters: { mcpWidget: { props: fullProps, theme: "dark" } },
};

export const Empty: Story = {
  parameters: { mcpWidget: { props: { acadTermId: "AY2026/27-T1", budget: null, bids: [] } } },
};

export const Loading: Story = {
  parameters: { mcpWidget: { toolOutput: null } },
};
