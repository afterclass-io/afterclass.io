import type { Meta, StoryObj } from "@storybook/react";
import { BidPredictionCard } from "./BidPredictionCard";


type SafetyFactor = { // re-declared as dates are not required
  beatsPercentage: number;
  multiplier: number;
};
type BidPrediction = {
  value: number;
  safetyFactor: SafetyFactor[];
  uncertainty: number;
};


const minPrediction: BidPrediction = {
  value: 12000,
  uncertainty: 2000,
  safetyFactor: [
    { beatsPercentage: 10, multiplier: 0.1 },
    { beatsPercentage: 20, multiplier: 0.2 },
    { beatsPercentage: 30, multiplier: 0.3 },
    { beatsPercentage: 40, multiplier: 0.4 },
    { beatsPercentage: 50, multiplier: 0.5 },
    { beatsPercentage: 60, multiplier: 0.6 },
    { beatsPercentage: 70, multiplier: 0.7 },
    { beatsPercentage: 80, multiplier: 0.8 },
    { beatsPercentage: 90, multiplier: 0.9 },
    { beatsPercentage: 100, multiplier: 1 },
  ],
};

const medianPrediction = {
  value: 15000,
  uncertainty: 2500,
  safetyFactor: [
    { beatsPercentage: 10, multiplier: 0.1 },
    { beatsPercentage: 20, multiplier: 0.2 },
    { beatsPercentage: 30, multiplier: 0.3 },
    { beatsPercentage: 40, multiplier: 0.4 },
    { beatsPercentage: 50, multiplier: 0.5 },
    { beatsPercentage: 60, multiplier: 0.6 },
    { beatsPercentage: 70, multiplier: 0.7 },
    { beatsPercentage: 80, multiplier: 0.8 },
    { beatsPercentage: 90, multiplier: 0.9 },
    { beatsPercentage: 100, multiplier: 1 },
  ],
};

const meta: Meta<typeof BidPredictionCard> = {
  title: "Bid Analytics/BidPredictionCard",
  component: BidPredictionCard,
  tags: ["autodocs"],
  args: {
    courseCode: "CS101",
    section: "T01",
    acadTermId: "AY2024/2025 Semester 1",
    hasBidsProbability: 0.8,
    confidenceScore: 0.75,
    minPrediction: minPrediction,
    medianPrediction: medianPrediction,

  },
};

export default meta;

type Story = StoryObj<typeof meta>;


export const Default: Story = {};

export const LowConfidence: Story = {
  args: {
    confidenceScore: 0.4,
  },
};

export const VeryHighConfidence: Story = {
  args: {
    confidenceScore: 0.95,
  },
};

export const UnlikelyToHaveBids: Story = {
  args: {
    hasBidsProbability: 0.2,
  },
};