/**
 * Shared bid-prediction math used by both /bidding/analytics and the
 * timetable slot bid panel.
 *
 * Model: recommended = predicted + multiplier × uncertainty, where the
 * multiplier comes from the empirical safety factors for the prediction's
 * term at the chosen success rate (beats percentage).
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 */

/** Structural subset of the Prisma `SafetyFactor` row this math relies on. */
export type SafetyFactorLike = {
  acadTermId: string;
  predictionType: string;
  multiplierType: string;
  beatsPercentage: number;
  multiplier: number;
};

export type PredictionTypeLike = "MIN" | "MEDIAN";

/**
 * Filter safety factors to the subset used by bid prediction: the given
 * term, the given prediction type, empirical multipliers only.
 */
export function filterSafetyFactors<T extends SafetyFactorLike>(
  factors: readonly T[],
  acadTermId: string,
  predictionType: PredictionTypeLike,
): T[] {
  return factors.filter(
    (sf) =>
      sf.acadTermId === acadTermId &&
      sf.multiplierType === "EMPIRICAL" &&
      sf.predictionType === predictionType,
  );
}

/**
 * Multiplier for a (pre-filtered) safety-factor list at the given success
 * rate. Falls back to 1 (i.e. no adjustment) when no factor matches.
 */
export function multiplierAt(
  factors: readonly SafetyFactorLike[],
  beatsPercentage: number,
): number {
  return (
    factors.find((sf) => sf.beatsPercentage === beatsPercentage)?.multiplier ??
    1
  );
}

/** recommended = predicted + multiplier × uncertainty. */
export function recommendedBid(
  predicted: number,
  multiplier: number,
  uncertainty: number,
): number {
  return predicted + multiplier * uncertainty;
}

export type BidPredictionLike = {
  bidWindow: { acadTermId: string };
  minPredicted: number;
  minUncertainty: number;
  medianPredicted: number;
  medianUncertainty: number;
};

export type RecommendedRange = {
  min: number;
  median: number;
};

/**
 * Confidence-adjusted recommended min/median for a prediction at the given
 * success rate — the numbers the success-rate slider drives.
 */
export function computeRecommendedRange(
  prediction: BidPredictionLike,
  safetyFactors: readonly SafetyFactorLike[],
  beatsPercentage: number,
): RecommendedRange {
  const acadTermId = prediction.bidWindow.acadTermId;
  return {
    min: recommendedBid(
      prediction.minPredicted,
      multiplierAt(
        filterSafetyFactors(safetyFactors, acadTermId, "MIN"),
        beatsPercentage,
      ),
      prediction.minUncertainty,
    ),
    median: recommendedBid(
      prediction.medianPredicted,
      multiplierAt(
        filterSafetyFactors(safetyFactors, acadTermId, "MEDIAN"),
        beatsPercentage,
      ),
      prediction.medianUncertainty,
    ),
  };
}
