import type { Meta, StoryObj } from "@storybook/react";
import BidExplorer from "./widget";
import { withMcpWidget } from "../../../../.storybook/withMcpWidget";

const history = [
  { acadTermId: "AY2024/25-T1", round: "1", window: 1, min: 10, median: 22, vacancy: 45 },
  { acadTermId: "AY2025/26-T1", round: "1", window: 1, min: 14, median: 28, vacancy: 40 },
];

const fullProps = {
  classId: "cl1",
  history,
  prediction: {
    medianPredicted: 30,
    minPredicted: 18,
    bidWindow: { id: 53, round: "1", window: 1 },
  },
  safetyFactors: [
    { beatsPercentage: 50, multiplier: 1.0 },
    { beatsPercentage: 70, multiplier: 1.05 },
    { beatsPercentage: 90, multiplier: 1.15 },
  ],
};

const historyOnlyProps = {
  classId: null,
  history,
  prediction: null,
  safetyFactors: [],
};

const meta: Meta<typeof BidExplorer> = {
  title: "MCP Apps/Bid Explorer",
  component: BidExplorer,
  decorators: [withMcpWidget],
  parameters: {},
};

export default meta;
type Story = StoryObj<typeof BidExplorer>;

export const Default: Story = {
  parameters: { mcpWidget: { props: fullProps } },
};

export const Dark: Story = {
  parameters: { mcpWidget: { props: fullProps, theme: "dark" } },
};

export const HistoryOnly: Story = {
  parameters: { mcpWidget: { props: historyOnlyProps } },
};

export const Loading: Story = {
  parameters: { mcpWidget: { toolOutput: null } },
};
