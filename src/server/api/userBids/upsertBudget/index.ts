import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const upsertBudget = protectedProcedure
  .input(
    z.object({
      acadTermId: z.string(),
      balance: z.number().min(0),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const result = await ctx.db.userBidBudget.upsert({
      where: {
        userId_acadTermId: {
          userId: ctx.session.user.id,
          acadTermId: input.acadTermId,
        },
      },
      create: {
        userId: ctx.session.user.id,
        acadTermId: input.acadTermId,
        balance: input.balance,
      },
      update: {
        balance: input.balance,
      },
    });

    return { balance: result.balance };
  });
