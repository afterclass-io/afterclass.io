import type { Prisma } from "@prisma/client";

/** Auto-name a new plan: Plan A, Plan B, … (falls back to the count). */
export function autoName(plansCount: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `Plan ${alphabet[plansCount] ?? String(plansCount)}`;
}

/**
 * The user's active plan for the term, creating one (auto-named like
 * `create` does for a first plan) when none exists.
 */
export async function findOrCreateActivePlan(
  db: Prisma.TransactionClient,
  userId: string,
  acadTermId: string,
) {
  const existing = await db.userTimetable.findFirst({
    where: { userId, acadTermId, isActive: true },
  });
  if (existing) return existing;
  const count = await db.userTimetable.count({ where: { userId, acadTermId } });
  return db.userTimetable.create({
    data: { userId, acadTermId, name: autoName(count), isActive: true },
  });
}
