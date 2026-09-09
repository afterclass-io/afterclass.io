import { TZDate } from "@date-fns/tz";

// Mirror of canonical `appTimezone` in `src/server/config/chat-config.ts`
// — keep both at Asia/Singapore. (Static const: the config getter is sync but
// this module must stay import-light for quota/period callers.)
const TZ = "Asia/Singapore";

/** "YYYY-MM" for the user's month, computed in Singapore time (~86% of users). */
export function currentMonthPeriod(now: Date = new Date()): string {
  const sgt = new TZDate(now, TZ);
  return `${sgt.getFullYear()}-${String(sgt.getMonth() + 1).padStart(2, "0")}`;
}
