import { criticalFloorFor } from "./quota-meter/logic";

export type QuotaAlertLevel = "warn" | "critical";

export type QuotaAlert = {
  level: QuotaAlertLevel;
  pct: number;
  remaining: number;
  quota: number;
};

export function getQuotaAlert(
  remaining: number,
  quota: number,
): QuotaAlert | null {
  // Band reconciliation (I11): "critical" fires at the shared critical floor
  // (criticalFloorFor: 20% of quota, min 1), so the alert bar, meter, welcome
  // push, and server isCritical agree. "warn" keeps its own 50% band — it is
  // the early nudge, intentionally wider than the meter's server-driven
  // nudgeAt (quota=20 → nudgeAt=16, i.e. remaining<=16): the bar is a cheap
  // client hint, the meter is the authoritative state. Zero remaining is
  // always critical regardless of quota.
  // Clamp 0–100 (Task 12): over-quota/negative arithmetic must never
  // render a >100% or negative bar.
  const pct = Math.min(
    100,
    Math.max(0, Math.round((remaining / Math.max(1, quota)) * 100)),
  );
  if (remaining <= 0) return { level: "critical", pct: 0, remaining, quota };
  if (remaining <= criticalFloorFor(quota))
    return { level: "critical", pct, remaining, quota };
  if (pct <= 50) return { level: "warn", pct, remaining, quota };
  return null;
}
