import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

/**
 * A class must exist and belong to the given academic term. Shared by
 * userBids.upsert/update (class↔window consistency) and timetable
 * addSlot/setSlotSection (class↔timetable term) — see hardening Task 2.
 */
export async function assertClassInTerm(
  db: PrismaClient,
  classId: string,
  acadTermId: string,
): Promise<void> {
  const cls = await db.classes.findUnique({
    where: { id: classId },
    select: { acadTermId: true },
  });
  if (!cls || cls.acadTermId !== acadTermId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Class does not belong to this academic term",
    });
  }
}
