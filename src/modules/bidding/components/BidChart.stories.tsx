import type { Meta, StoryObj } from "@storybook/nextjs";
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
  {
    bidWindow: "AY202425T1/1/1",
    price: [12, 18] as [number, number],
    size: 48,
  },
  {
    bidWindow: "AY202425T1/1A/1",
    price: [14, 19] as [number, number],
    size: 48,
  },
  {
    bidWindow: "AY202425T1/1A/2",
    price: [13, 17] as [number, number],
    size: 48,
  },
  {
    bidWindow: "AY202425T1/1B/1",
    price: [15, 20] as [number, number],
    size: 48,
  },
  {
    bidWindow: "AY202425T1/2/1",
    price: [16, 21] as [number, number],
    size: 48,
  },
  {
    bidWindow: "AY202526T1/1/1",
    price: [10, 16] as [number, number],
    size: 50,
  },
  {
    bidWindow: "AY202526T1/1A/1",
    price: [11, 18] as [number, number],
    size: 50,
  },
  {
    bidWindow: "AY202526T1/1B/1",
    price: [13, 19] as [number, number],
    size: 50,
  },
  {
    bidWindow: "AY202526T1/1C/1",
    price: [14, 20] as [number, number],
    size: 50,
  },
  {
    bidWindow: "AY202526T1/2/1",
    price: [15, 22] as [number, number],
    size: 50,
  },
  {
    bidWindow: "AY202526T1/2/2",
    price: [16, 23] as [number, number],
    size: 50,
  },
  {
    bidWindow: "AY202627T1/1/1",
    price: [18, 25] as [number, number],
    size: 45,
  },
  {
    bidWindow: "AY202627T1/1A/1",
    price: [19, 27] as [number, number],
    size: 45,
  },
  {
    bidWindow: "AY202627T1/1A/2",
    price: [20, 28] as [number, number],
    size: 45,
  },
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
    chartData: multiYearData.filter((d) =>
      d.bidWindow.startsWith("AY202627T1"),
    ),
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
    chartData: [
      {
        bidWindow: "AY202627T1/1/1",
        price: [15, 22] as [number, number],
        size: 48,
      },
    ],
  },
};

/**
 * One data point per academic year — this is what a single round + window
 * selection produces, and it previously overflowed the x-axis labels at
 * the left and right edges (each AY group collapses to a zero-width band).
 */
export const SinglePointPerTerm: Story = {
  args: {
    chartData: [
      {
        bidWindow: "AY202223T1/1A/2",
        price: [18, 24] as [number, number],
        size: 40,
      },
      {
        bidWindow: "AY202324T1/1A/2",
        price: [20, 26] as [number, number],
        size: 38,
      },
      {
        bidWindow: "AY202425T1/1A/2",
        price: [22, 27] as [number, number],
        size: 35,
      },
      {
        bidWindow: "AY202526T1/1A/2",
        price: [24, 30] as [number, number],
        size: 42,
      },
    ],
  },
};

/** Multiple rounds/windows per term — the normal case that must stay unchanged. */
export const MultipleRoundsPerTerm: Story = {
  args: {
    chartData: [
      {
        bidWindow: "AY202425T1/1/1",
        price: [16, 20] as [number, number],
        size: 30,
      },
      {
        bidWindow: "AY202425T1/1/2",
        price: [18, 22] as [number, number],
        size: 34,
      },
      {
        bidWindow: "AY202425T1/1A/2",
        price: [21, 26] as [number, number],
        size: 36,
      },
      {
        bidWindow: "AY202425T1/2/1",
        price: [24, 29] as [number, number],
        size: 33,
      },
    ],
  },
};

/**
 * Prices in the hundreds — the compact formatter emits 2-dp strings like
 * "e$999.00" (~54px at fontSize 12), which previously clipped the leading
 * "e" against the SVG edge because the y-axis gutter was too narrow.
 */
export const LargeAmounts: Story = {
  args: {
    chartData: [
      {
        bidWindow: "AY202425T1/1/1",
        price: [480, 650] as [number, number],
        size: 40,
      },
      {
        bidWindow: "AY202425T1/1A/2",
        price: [520, 720] as [number, number],
        size: 44,
      },
      {
        bidWindow: "AY202425T1/2/1",
        price: [610, 810] as [number, number],
        size: 38,
      },
      {
        bidWindow: "AY202526T1/1/1",
        price: [700, 899] as [number, number],
        size: 50,
      },
      {
        bidWindow: "AY202526T1/1A/2",
        price: [760, 960] as [number, number],
        size: 42,
      },
      {
        bidWindow: "AY202526T1/2/1",
        price: [830, 999] as [number, number],
        size: 36,
      },
    ],
  },
};
