import type { ChatConfig } from "@/server/config/chat-config";

export type ThresholdConfig = Pick<
  ChatConfig,
  | "moderationReportThreshold"
  | "moderationBackoffMultiplier"
  | "moderationThresholdCap"
>;

/**
 * Distinct reporters (counted since the item's last clearance) needed to
 * call the judge. Multiplies with every clearance, never above the cap. The
 * cap bounds how many NEW reporters a re-check needs; it never lets every
 * further report trigger a judgement, because counting restarts at each
 * clearance.
 */
export function effectiveThreshold(
  cfg: ThresholdConfig,
  clearances: number,
): number {
  return Math.min(
    cfg.moderationThresholdCap,
    cfg.moderationReportThreshold *
      cfg.moderationBackoffMultiplier ** clearances,
  );
}
