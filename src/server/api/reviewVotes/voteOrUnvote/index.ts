import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const voteOrUnvote = protectedProcedure
  .input(
    z.object({
      reviewId: z.string(),
      weight: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
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
