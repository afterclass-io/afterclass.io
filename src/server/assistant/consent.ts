import { db } from "@/server/db";

/**
 * Single-column AI consent (NULL = never consented, fail-closed).
 *
 * `userId` is `session.user.id`, which is the `Users.id` — the same id the
 * chat route already passes as `userId` to `ChatUsage` quota writes.
 */

/** Consent timestamp for a user, or null when never consented / unknown. */
export async function getAiConsentDate(userId: string): Promise<Date | null> {
  const row = await db.users.findUnique({
    where: { id: userId },
    select: { aiConsent: true },
  });
  return row?.aiConsent ?? null;
}

/** Stamp consent now; returns the stamped date. */
export async function setAiConsentNow(userId: string): Promise<Date> {
  const row = await db.users.update({
    where: { id: userId },
    data: { aiConsent: new Date() },
    select: { aiConsent: true },
  });
  // aiConsent was just written, so it is non-null — but guard anyway.
  return row.aiConsent ?? new Date();
}
