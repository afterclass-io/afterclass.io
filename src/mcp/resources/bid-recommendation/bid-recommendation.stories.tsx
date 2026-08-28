import type { Meta, StoryObj } from "@storybook/react";
import BidRecommendation from "./widget";
import { withMcpWidget } from "../../../../.storybook/withMcpWidget";

const fullProps = {
  classId: "cl1",
  acadTermId: "t1",
  bidWindow: { id: 53, round: "1", window: 1 },
  predictedMedian: 25,
  suggestedBidAmount: 26.25,
  multiplierUsed: { beatsPercentage: 70, multiplier: 1.05 },
  rationale: "Predicted median 25 x safety multiplier 1.05 (beats 70% of bids).",
};

const minimalProps = {
  classId: "cl2",
  acadTermId: "t1",
  predictedMedian: 20,
  suggestedBidAmount: 20,
};

const meta: Meta<typeof BidRecommendation> = {
  title: "MCP Apps/Bid Recommendation",
  component: BidRecommendation,
  decorators: [withMcpWidget],
  parameters: {},
};

export default meta;
type Story = StoryObj<typeof BidRecommendation>;

export const Default: Story = {
  parameters: { mcpWidget: { props: fullProps } },
};

export const Dark: Story = {
  parameters: { mcpWidget: { props: fullProps, theme: "dark" } },
};

export const Minimal: Story = {
  parameters: { mcpWidget: { props: minimalProps } },
};

export const Loading: Story = {
  parameters: { mcpWidget: { toolOutput: null } },
};
