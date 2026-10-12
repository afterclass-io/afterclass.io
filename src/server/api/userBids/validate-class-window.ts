import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/generated/prisma/client";

import { assertClassInTerm } from "@/server/api/classes/assertClassInTerm";

/**
 * A bid's class and bid window must exist and belong to the SAME academic
 * term (a bid for term A cannot point at a class from term B).
 */
export async function validateClassWindowPair(
  db: PrismaClient,
  classId: string,
  bidWindowId: number,
): Promise<void> {
  const window = await db.bidWindow.findUnique({
    where: { id: bidWindowId },
    select: { acadTermId: true },
  });
  if (!window) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown bid window" });
  }
  await assertClassInTerm(db, classId, window.acadTermId);
}
