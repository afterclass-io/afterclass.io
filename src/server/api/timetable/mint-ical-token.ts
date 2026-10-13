import type { PrismaClient } from "@/generated/prisma/client";
import { mintToken } from "@/server/api/ownership";

/**
 * Mint a fresh iCal feed token and store it on the caller's timetable.
 * The caller must have checked ownership first (requireOwnedTimetable).
 * The write is also scoped to the caller's row (TOCTOU hardening).
 */
export async function mintAndStoreIcalToken(
  db: PrismaClient,
  timetableId: string,
  userId: string,
): Promise<string> {
  const icalToken = mintToken();
  await db.userTimetable.update({
    where: { id: timetableId, userId },
    data: { icalToken },
  });
  return icalToken;
}
