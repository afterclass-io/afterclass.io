export type QuotaLevel = "ok" | "low" | "critical";

export function getQuotaMeterState(
  remaining: number,
  quota: number,
  nudgeAt: number,
): { level: QuotaLevel; pct: number; remaining: number; quota: number } {
  const pct = Math.max(0, Math.min(100, Math.round((remaining / Math.max(1, quota)) * 100)));
  const criticalFloor = Math.max(1, Math.floor(quota * 0.2));
  const level: QuotaLevel =
    remaining <= criticalFloor ? "critical" : remaining <= nudgeAt ? "low" : "ok";
  return { level, pct, remaining, quota };
}
