import type { Prisma } from "@/generated/prisma/client";
import { findOrCreateActivePlan } from "@/server/api/timetable/create/helpers";

/**
 * After a bid status change: one active row per class, siblings PARTICIPATED.
 * Any other bid on the same class (different bid windows) that is still in a
 * user-visible state is demoted to the system-only PARTICIPATED status so the
 * bids table and timetable stay in sync.
 */
export async function demoteSiblingBids(
  db: Prisma.TransactionClient,
  userId: string,
  classId: string,
  keepBidId: string,
): Promise<void> {
  await db.userBid.updateMany({
    where: {
      userId,
      classId,
      id: { not: keepBidId },
      status: { in: ["PLANNED", "SECURED", "DROPPED", "CANCELLED"] },
    },
    data: { status: "PARTICIPATED" },
  });
}

/**
 * A SECURED bid's class must appear on the user's active timetable for the
 * term. Creates the default active timetable when none exists (same
 * auto-naming as `timetable.create` for a first plan).
 */
export async function syncSecuredBidToActiveTimetable(
  db: Prisma.TransactionClient,
  userId: string,
  acadTermId: string,
  classId: string,
): Promise<void> {
  const plan = await findOrCreateActivePlan(db, userId, acadTermId);
  await db.userTimetableSlot.createMany({
    data: [{ timetableId: plan.id, classId }],
    skipDuplicates: true,
  });
}
