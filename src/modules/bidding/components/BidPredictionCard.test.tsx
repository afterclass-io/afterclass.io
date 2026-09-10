// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BidPredictionCard } from "./BidPredictionCard";
import { MultiplierType, PredictionType } from "@/generated/prisma/enums";
import {
  multiplierAt,
  recommendedBid,
} from "@/modules/bidding/utils/bid-prediction";

// Real seed multipliers (`prisma/data/22_safety_factors.json`, AY202627T1
// EMPIRICAL): the card's slider marks are 50/60/70/80/90/95.
// IS215 G1 shape (predicted/uncertainty): min 8.31 ± 5.20, median 18.36 ±
// 6.04 — so the header derives e.g. 70%: 8.31 + 0.54 x 5.20 = 11.12,
// 80%: 8.31 + 0.88 x 5.20 = 12.89.
function safetyFactor(beatsPercentage: number, multiplier: number) {
  return {
    acadTermId: "AY202627T1",
    predictionType: PredictionType.MEDIAN,
    multiplierType: MultiplierType.EMPIRICAL,
    beatsPercentage,
    multiplier,
    createdAt: new Date(),
  };
}

const SAFETY_FACTORS = [
  safetyFactor(50, 0),
  safetyFactor(55, 0.13),
  safetyFactor(60, 0.25),
  safetyFactor(65, 0.39),
  safetyFactor(70, 0.54),
  safetyFactor(75, 0.7),
  safetyFactor(80, 0.88),
  safetyFactor(85, 1.09),
  safetyFactor(90, 1.37),
  safetyFactor(95, 1.81),
];

function renderCard() {
  render(
    <BidPredictionCard
      courseCode="IS215"
      section="G1"
      bidWindow={{ acadTermId: "AY202627T1", round: "1A", window: 3 }}
      hasBidsProbability={0.9452}
      confidenceScore={0.6139}
      minPrediction={{
        value: 8.31,
        safetyFactor: SAFETY_FACTORS.map((sf) => ({
          ...sf,
          predictionType: PredictionType.MIN,
        })),
        uncertainty: 5.2,
      }}
      medianPrediction={{
        value: 18.36,
        safetyFactor: SAFETY_FACTORS,
        uncertainty: 6.04,
      }}
    />,
  );
}

describe("BidPredictionCard slider math", () => {
  it("defaults to the 70% factor and derives the IS215 header range", () => {
    renderCard();
    // 8.31 + 0.54 x 5.20 = 11.118 -> e$11.12; 18.36 + 0.54 x 6.04 = 21.6216
    // -> e$21.62 (formatBidCurrencyCompact keeps 2 decimals under e$1K).
    expect(screen.getByText("e$11.12")).toBeInTheDocument();
    expect(screen.getByText("e$21.62")).toBeInTheDocument();
    // Both the min and median formulas show the 70% multiplier.
    expect(screen.getAllByText("0.54")).toHaveLength(2);
  });

  it("moves to the 80% factor when the slider steps up one mark", () => {
    renderCard();
    const slider = screen.getByRole("slider");
    // rc-slider's handle is a div with keyboard support: ArrowRight steps to
    // the next mark (70 -> 80), firing onChange -> setBeatsPercentage.
    fireEvent.keyDown(slider, { key: "ArrowRight", keyCode: 39 });
    // 8.31 + 0.88 x 5.20 = 12.886 -> e$12.89; 18.36 + 0.88 x 6.04 = 23.6752
    // -> e$23.68.
    expect(screen.getByText("e$12.89")).toBeInTheDocument();
    expect(screen.getByText("e$23.68")).toBeInTheDocument();
    // Both the min and median formulas show the 80% multiplier.
    expect(screen.getAllByText("0.88")).toHaveLength(2);
  });

  it("matches the shared bid-prediction math exactly (parity pin)", () => {
    // If the component's inline formula ever drifts from the canonical
    // `recommendedBid` / `multiplierAt` helpers, this fails instead of the
    // screenshots silently going stale.
    expect(multiplierAt(SAFETY_FACTORS, 70)).toBe(0.54);
    expect(multiplierAt(SAFETY_FACTORS, 80)).toBe(0.88);
    expect(recommendedBid(8.31, 0.54, 5.2)).toBeCloseTo(11.118, 10);
    expect(recommendedBid(18.36, 0.88, 6.04)).toBeCloseTo(23.6752, 10);
  });
});
