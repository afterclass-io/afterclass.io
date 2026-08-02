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
    const existing = await ctx.db.userBid.findFirst({
      where: {
        userId: ctx.session.user.id,
        classId: input.classId,
        bidWindowId: input.bidWindowId,
      },
    });

    if (existing) {
      return ctx.db.userBid.update({
        where: { id: existing.id },
        data: {
          bidAmount: input.bidAmount,
          notes: input.notes,
        },
      });
    }

    return ctx.db.userBid.create({
      data: {
        userId: ctx.session.user.id,
        classId: input.classId,
        bidWindowId: input.bidWindowId,
        bidAmount: input.bidAmount,
        notes: input.notes,
        status: "PLANNED",
      },
    });
  });
