export type QuotaLevel = "ok" | "low" | "critical";

/**
 * Single source of truth for the "critical" floor: this many remaining (or
 * fewer) is critical. Shared by the server quota reader (`getQuotaState` in
 * src/server/assistant/quota.ts), the quota meter, and the welcome bubble's
 * low-quota push. The floor is 20% of quota (min 1).
 */
export function criticalFloorFor(quota: number): number {
  return Math.max(1, Math.floor(quota * 0.2));
}

export function getQuotaMeterState(
  remaining: number,
  quota: number,
  nudgeAt: number,
): { level: QuotaLevel; pct: number; remaining: number; quota: number } {
  const pct = Math.max(
    0,
    Math.min(100, Math.round((remaining / Math.max(1, quota)) * 100)),
  );
  const criticalFloor = criticalFloorFor(quota);
  const level: QuotaLevel =
    remaining <= criticalFloor
      ? "critical"
      : remaining <= nudgeAt
        ? "low"
        : "ok";
  return { level, pct, remaining, quota };
}
