import type { Meta, StoryObj } from "@storybook/react";
import { BidChart } from "./BidChart";

const meta: Meta<typeof BidChart> = {
  title: "Bid Analytics/BidChart",
  component: BidChart,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-full max-w-3xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Mock data spanning 3 academic years across multiple rounds and windows. */
const multiYearData = [
  { bidWindow: "AY202425T1/1/1", price: [12, 18] as [number, number], size: 48 },
  { bidWindow: "AY202425T1/1A/1", price: [14, 19] as [number, number], size: 48 },
  { bidWindow: "AY202425T1/1A/2", price: [13, 17] as [number, number], size: 48 },
  { bidWindow: "AY202425T1/1B/1", price: [15, 20] as [number, number], size: 48 },
  { bidWindow: "AY202425T1/2/1", price: [16, 21] as [number, number], size: 48 },
  { bidWindow: "AY202526T1/1/1", price: [10, 16] as [number, number], size: 50 },
  { bidWindow: "AY202526T1/1A/1", price: [11, 18] as [number, number], size: 50 },
  { bidWindow: "AY202526T1/1B/1", price: [13, 19] as [number, number], size: 50 },
  { bidWindow: "AY202526T1/1C/1", price: [14, 20] as [number, number], size: 50 },
  { bidWindow: "AY202526T1/2/1", price: [15, 22] as [number, number], size: 50 },
  { bidWindow: "AY202526T1/2/2", price: [16, 23] as [number, number], size: 50 },
  { bidWindow: "AY202627T1/1/1", price: [18, 25] as [number, number], size: 45 },
  { bidWindow: "AY202627T1/1A/1", price: [19, 27] as [number, number], size: 45 },
  { bidWindow: "AY202627T1/1A/2", price: [20, 28] as [number, number], size: 45 },
];

/** Dense data — many windows in a single year to trigger simplified dot rendering (≥15 points). */
const denseData = Array.from({ length: 16 }, (_, i) => ({
  bidWindow: `AY202425T1/1/${i + 1}`,
  price: [10 + i * 0.5, 15 + i * 0.7] as [number, number],
  size: 50,
}));

export const Default: Story = {
  args: {
    chartData: multiYearData,
  },
};

export const SingleTerm: Story = {
  args: {
    chartData: multiYearData.filter((d) => d.bidWindow.startsWith("AY202627T1")),
  },
};

export const ManyPoints: Story = {
  args: {
    chartData: denseData,
  },
};

export const WithCurrentWindow: Story = {
  args: {
    chartData: multiYearData,
    currentWindowBidWindow: "AY202627T1/1A/1",
  },
};

export const Empty: Story = {
  args: {
    chartData: [],
  },
};

export const SinglePoint: Story = {
  args: {
    chartData: [{ bidWindow: "AY202627T1/1/1", price: [15, 22] as [number, number], size: 48 }],
  },
};
