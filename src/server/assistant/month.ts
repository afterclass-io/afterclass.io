import { TZDate } from "@date-fns/tz";

const TZ = "Asia/Singapore";

/** "YYYY-MM" for the user's month, computed in Singapore time (~86% of users). */
export function currentMonthPeriod(now: Date = new Date()): string {
  const sgt = new TZDate(now, TZ);
  return `${sgt.getFullYear()}-${String(sgt.getMonth() + 1).padStart(2, "0")}`;
}
