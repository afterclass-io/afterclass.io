import type { Meta, StoryObj } from "@storybook/nextjs";
import { BidPredictionCard } from "./BidPredictionCard";
import type { BidPrediction } from "./BidPredictionCard";
import { MultiplierType, PredictionType } from "@/generated/prisma/enums";

type MiniSafetyFactor = {
  // re-declared as dates are not required
  beatsPercentage: number;
  multiplier: number;
};
type MiniBidPrediction = {
  value: number;
  safetyFactor: MiniSafetyFactor[];
  uncertainty: number;
};

// Safety factors mirror the real seed data
// (`prisma/data/22_safety_factors.json`, AY202627T1 EMPIRICAL): 50–95 in
// steps of 5 with ascending multipliers. The uncertainties are non-zero so
// the success-rate slider actually moves the recommended amounts, exactly
// like the live card (recommended = predicted + multiplier x uncertainty).
const SEED_MULTIPLIERS: MiniSafetyFactor[] = [
  { beatsPercentage: 50, multiplier: 0 },
  { beatsPercentage: 55, multiplier: 0.13 },
  { beatsPercentage: 60, multiplier: 0.25 },
  { beatsPercentage: 65, multiplier: 0.39 },
  { beatsPercentage: 70, multiplier: 0.54 },
  { beatsPercentage: 75, multiplier: 0.7 },
  { beatsPercentage: 80, multiplier: 0.88 },
  { beatsPercentage: 85, multiplier: 1.09 },
  { beatsPercentage: 90, multiplier: 1.37 },
  { beatsPercentage: 95, multiplier: 1.81 },
];

const minPrediction: MiniBidPrediction = {
  // IS215 G1 shape (see screenshots): the slider then derives the header
  // range, e.g. 70%: 8.31 + 0.54 x 5.20 = 11.12; 80%: 8.31 + 0.88 x 5.20 =
  // 12.89.
  value: 8.31,
  uncertainty: 5.2,
  safetyFactor: SEED_MULTIPLIERS,
};

const medianPrediction: MiniBidPrediction = {
  // IS215 G1 shape: 70%: 18.36 + 0.54 x 6.04 = 21.62; 80%: 18.36 + 0.88 x
  // 6.04 = 23.68.
  value: 18.36,
  uncertainty: 6.04,
  safetyFactor: SEED_MULTIPLIERS,
};

const transformBidPrediction = (
  prediction: MiniBidPrediction,
  acadTermId: string,
  predictionType: PredictionType,
): BidPrediction => {
  const transformedSafetyFactors = prediction.safetyFactor.map((sf) => ({
    ...sf,
    acadTermId,
    predictionType,
    // EMPIRICAL matches the real seed rows — the semantics the shared
    // `filterSafetyFactors` helper (and the page) rely on.
    multiplierType: MultiplierType.EMPIRICAL,
    createdAt: new Date(),
  }));

  return {
    ...prediction,
    safetyFactor: transformedSafetyFactors,
  };
};

// Transform the data before passing it to the component
const transformedMinPrediction = transformBidPrediction(
  minPrediction,
  "AY202627T1",
  PredictionType.MIN,
);
const transformedMedianPrediction = transformBidPrediction(
  medianPrediction,
  "AY202627T1",
  PredictionType.MEDIAN,
);

const meta: Meta<typeof BidPredictionCard> = {
  title: "Bid Analytics/BidPredictionCard",
  component: BidPredictionCard,
  tags: ["autodocs"],
  args: {
    courseCode: "IS215",
    section: "G1",
    bidWindow: {
      acadTermId: "AY202627T1",
      round: "1A",
      window: 3,
    },
    hasBidsProbability: 0.9452,
    confidenceScore: 0.6139,
    minPrediction: transformedMinPrediction,
    medianPrediction: transformedMedianPrediction,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowConfidence: Story = {
  args: {
    confidenceScore: 0.4,
    minPrediction: transformedMinPrediction,
    medianPrediction: transformedMedianPrediction,
  },
};

export const VeryHighConfidence: Story = {
  args: {
    confidenceScore: 0.95,
    minPrediction: transformedMinPrediction,
    medianPrediction: transformedMedianPrediction,
  },
};

export const UnlikelyToHaveBids: Story = {
  args: {
    hasBidsProbability: 0.2,
    minPrediction: transformedMinPrediction,
    medianPrediction: transformedMedianPrediction,
  },
};
