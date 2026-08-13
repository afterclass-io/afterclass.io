import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function createSlotIfMissing(
  db: DbClient,
  timetableId: string,
  classId: string,
): Promise<boolean> {
  const res = await db.userTimetableSlot.createMany({
    data: [{ timetableId, classId }],
    skipDuplicates: true,
  });
  return res.count === 1;
}

/**
 * Bulk-insert slots, relying on `@@unique([timetableId, classId])` to skip
 * rows that already exist — no check-then-act race, no P2002 500.
 */
export async function createSlotsSkipDuplicates(
  db: DbClient,
  timetableId: string,
  classIds: string[],
): Promise<void> {
  if (classIds.length === 0) return;
  await db.userTimetableSlot.createMany({
    data: classIds.map((classId) => ({ timetableId, classId })),
    skipDuplicates: true,
  });
}
