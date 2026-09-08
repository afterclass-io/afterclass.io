/** SMU BOSS floor: no bid below e$10 can clear. Canonical value lives in
 * `src/server/config/chat-config.ts` (`minBid`); this literal is the
 * sync-mirror so the hot bid path stays dependency-free — keep the two at 10. */
export const MIN_BID = 10;
export function clampBidFloor(amount: number): number {
  return Math.max(MIN_BID, amount);
}

/**
 * Suggest a bid amount from a predicted median and an optional safety
 * multiplier. Null-safe: a null median yields no suggestion (null); the
 * multiplier defaults to 1.0 and the e$10 floor always applies.
 */
export function suggestBidAmount(
  median: number | null,
  multiplier?: number | null,
): number | null {
  if (median === null) return null;
  const m = multiplier ?? 1;
  return clampBidFloor(Math.round(median * m * 100) / 100);
}

/**
 * One-line rationale for a suggested bid, unifying the recommend /
 * bid-estimate prose. With a multiplier: median × multiplier at the given
 * confidence; without: median × 1.0 (no matching safety factor).
 */
export function rationaleFor(
  median: number,
  multiplierUsed?: number | null,
  beatsPercentage: number = DEFAULT_BEATS_PERCENTAGE,
  acadTermId?: string,
): string {
  if (multiplierUsed != null) {
    return `Predicted median ${median} x safety multiplier ${multiplierUsed} (beats ${beatsPercentage}% of bids).`;
  }
  return acadTermId
    ? `No safety factor for beats ${beatsPercentage}% in ${acadTermId}; suggested = predicted median ${median} x 1.0.`
    : `No safety factor for beats ${beatsPercentage}%; suggested = predicted median ${median} x 1.0.`;
}

/** Default confidence level: the suggested amount beats this % of bids.
 * Canonical value lives in `src/server/config/chat-config.ts`
 * (`defaultBeatsPct`); this literal is the sync-mirror — keep both at 70. */
export const DEFAULT_BEATS_PERCENTAGE = 70;

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
