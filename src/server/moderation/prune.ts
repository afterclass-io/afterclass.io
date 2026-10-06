import { db } from "@/server/db";

const DAY_MS = 86_400_000;

/**
 * Clear the removed text from moderation log rows older than the retention
 * period. Everything else on the row (surface, item id, verdict, rule,
 * language, rationale, model, time) is kept for audit. Idempotent; safe on
 * any schedule.
 */
export async function pruneModerationLogText(
  retentionDays: number,
  now: Date = new Date(),
): Promise<{ cleared: number }> {
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
  const res = await db.moderationLog.updateMany({
    where: { removedText: { not: null }, createdAt: { lt: cutoff } },
    data: { removedText: null },
  });
  return { cleared: res.count };
}
