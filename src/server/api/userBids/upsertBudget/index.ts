import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { spentForTerm } from "@/server/api/userBids/assert-budget";

export const upsertBudget = protectedProcedure
  .input(
    z.object({
      acadTermId: z.string(),
      balance: z.number().min(0),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // Guard the budget invariant: the balance can never drop below the
    // amount already secured (e$ already spent this term).
    const spent = await spentForTerm(
      ctx.db,
      ctx.session.user.id,
      input.acadTermId,
    );
    if (input.balance < spent) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Budget cannot be lower than what you've already spent",
      });
    }

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
