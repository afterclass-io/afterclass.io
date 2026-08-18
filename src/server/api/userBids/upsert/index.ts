import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const upsert = protectedProcedure
  .input(
    z.object({
      classId: z.string(),
      bidWindowId: z.number().int().positive(),
      bidAmount: z.number().positive().max(99999),
      notes: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
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
