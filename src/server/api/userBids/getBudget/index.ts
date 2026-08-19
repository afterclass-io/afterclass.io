import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const getBudget = protectedProcedure
  .input(z.object({ acadTermId: z.string() }))
  .query(async ({ ctx, input }) => {
    const budget = await ctx.db.userBidBudget.findUnique({
      where: {
        userId_acadTermId: {
          userId: ctx.session.user.id,
          acadTermId: input.acadTermId,
        },
      },
    });

    if (!budget) return null;

    return { balance: budget.balance };
  });
