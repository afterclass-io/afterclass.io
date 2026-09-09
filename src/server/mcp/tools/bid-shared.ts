import { getBidLimits } from "@/server/config/chat-config";

/** SMU BOSS floor: no bid below e$10 can clear. Canonical value lives in
 * `src/server/config/chat-config.ts` (`minBid`); read through the getter
 * so env/file overrides move every consumer at once. Kept as an exported
 * const (module-scope getter call) so existing `MIN_BID` imports keep working. */
export const MIN_BID: number = getBidLimits().minBid;
export function clampBidFloor(amount: number): number {
  return Math.max(getBidLimits().minBid, amount);
}

/**
 * Suggest a bid amount from a predicted median, the safety multiplier for
 * the chosen success rate, and the prediction's uncertainty:
 * recommended = predicted + multiplier x uncertainty (same additive model
 * as the analytics card). Null-safe: a null median yields no suggestion
 * (null); the multiplier defaults to 1.0 and the e$10 floor always applies.
 */
export function suggestBidAmount(
  median: number | null,
  multiplier?: number | null,
  uncertainty = 0,
): number | null {
  if (median === null) return null;
  const m = multiplier ?? 1;
  return clampBidFloor(Math.round((median + m * uncertainty) * 100) / 100);
}

/**
 * One-line rationale for a suggested bid, unifying the recommend /
 * bid-estimate prose. With a multiplier: predicted + multiplier x
 * uncertainty at the given confidence; without: the predicted median alone
 * (no matching safety factor).
 */
export function rationaleFor(
  median: number,
  multiplierUsed?: number | null,
  beatsPercentage: number = DEFAULT_BEATS_PERCENTAGE,
  acadTermId?: string,
  uncertainty = 0,
): string {
  if (multiplierUsed != null) {
    return `Predicted ${median} + safety multiplier ${multiplierUsed} x uncertainty ${uncertainty} (beats ${beatsPercentage}% of bids).`;
  }
  return acadTermId
    ? `No safety factor for beats ${beatsPercentage}% in ${acadTermId}; suggested = predicted median ${median}.`
    : `No safety factor for beats ${beatsPercentage}%; suggested = predicted median ${median}.`;
}

/** Default confidence level: the suggested amount beats this % of bids.
 * Canonical value lives in `src/server/config/chat-config.ts`
 * (`defaultBeatsPct`); read through the getter. Kept as an exported const
 * (module-scope getter call) so existing imports keep working. */
export const DEFAULT_BEATS_PERCENTAGE: number = getBidLimits().defaultBeatsPct;

type SafetyFactorRow = {
  acadTermId: string;
  predictionType: string;
  beatsPercentage: number;
  multiplier: number;
};

/**
 * Find the safety-factor row for one term at the given confidence (default
 * 70%), MEDIAN predictions only.
 */
export function findSafetyFactor(
  factors: SafetyFactorRow[],
  acadTermId: string,
  beatsPercentage: number = DEFAULT_BEATS_PERCENTAGE,
  predictionType = "MEDIAN",
): SafetyFactorRow | undefined {
  return factors.find(
    (f) =>
      f.acadTermId === acadTermId &&
      f.predictionType === predictionType &&
      f.beatsPercentage === beatsPercentage,
  );
}

export function stripBidNotes<T extends object>(row: T): Omit<T, "notes"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- notes is user PII, must not reach the LLM
  const { notes: _dropped, ...rest } = row as T & { notes?: unknown };
  return rest;
}
