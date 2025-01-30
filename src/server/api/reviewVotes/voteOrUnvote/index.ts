import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const voteOrUnvote = protectedProcedure
  .input(
    z.object({
      reviewId: z.string(),
      userId: z.string(),
      weight: z.number(),
    }),
  )
  .mutation(
    async ({ input, ctx }) =>
      await ctx.db.reviewVotes.upsert({
        where: {
          reviewId_voterId: {
            reviewId: input.reviewId,
            voterId: input.userId,
          },
        },
        create: {
          reviewId: input.reviewId,
          voterId: input.userId,
          weight: input.weight,
        },
        update: {
          weight: input.weight,
        },
      }),
  );
