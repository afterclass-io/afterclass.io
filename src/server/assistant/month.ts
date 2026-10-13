import { TZDate } from "@date-fns/tz";

// Mirror of canonical `appTimezone` in `src/server/config/chat-config.ts`.
// This module must stay import-light for quota/period callers, so it keeps a
// literal. `src/server/config/mirrored-tunables.test.ts` fails if they differ.
const TZ = "Asia/Singapore";

/** "YYYY-MM" for the user's month, computed in Singapore time (~86% of users). */
export function currentMonthPeriod(now: Date = new Date()): string {
  const sgt = new TZDate(now, TZ);
  return `${sgt.getFullYear()}-${String(sgt.getMonth() + 1).padStart(2, "0")}`;
}
