import { z } from "zod";

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

import { protectedProcedure } from "@/server/api/trpc";
import { assertClassInTerm } from "@/server/api/classes/assertClassInTerm";

/**
 * A bid's class and bid window must exist and belong to the SAME academic
 * term (a bid for term A cannot point at a class from term B).
 */
async function validateClassWindowPair(
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

export const upsert = protectedProcedure
  .input(
    z.object({
      classId: z.string(),
      bidWindowId: z.number().int().positive(),
      bidAmount: z.number().positive().max(99999), // sync-mirror of canonical maxBidAmount (chat-config.ts)
      notes: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await validateClassWindowPair(ctx.db, input.classId, input.bidWindowId);

    return ctx.db.userBid.upsert({
      where: {
        userId_classId_bidWindowId: {
          userId: ctx.session.user.id,
          classId: input.classId,
          bidWindowId: input.bidWindowId,
        },
      },
      update: {
        bidAmount: input.bidAmount,
        notes: input.notes,
      },
      create: {
        userId: ctx.session.user.id,
        classId: input.classId,
        bidWindowId: input.bidWindowId,
        bidAmount: input.bidAmount,
        notes: input.notes,
        status: "PLANNED",
      },
    });
  });
