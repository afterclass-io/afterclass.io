import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const voteOrUnvote = protectedProcedure
  .input(
    z.object({
      reviewId: z.string(),
      weight: z.number(),
    }),
  )
  .mutation(
    async ({ input, ctx }) =>
      await ctx.db.reviewVotes.upsert({
        where: {
          reviewId_voterId: {
            reviewId: input.reviewId,
            voterId: ctx.session.user.id,
          },
        },
        create: {
          reviewId: input.reviewId,
          voterId: ctx.session.user.id,
          weight: input.weight,
        },
        update: {
          weight: input.weight,
        },
      }),
  );
