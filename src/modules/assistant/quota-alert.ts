export type QuotaAlertLevel = "warn" | "critical";

export type QuotaAlert = {
  level: QuotaAlertLevel;
  pct: number;
  remaining: number;
  quota: number;
};

export function getQuotaAlert(remaining: number, quota: number): QuotaAlert | null {
  const pct = Math.round((remaining / Math.max(1, quota)) * 100);
  if (remaining <= 0) return { level: "critical", pct: 0, remaining, quota };
  if (pct <= 10) return { level: "critical", pct, remaining, quota };
  if (pct <= 50) return { level: "warn", pct, remaining, quota };
  return null;
}
