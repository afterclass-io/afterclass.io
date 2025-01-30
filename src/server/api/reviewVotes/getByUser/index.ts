import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const getByUser = protectedProcedure
  .input(
    z.object({
      userId: z.string().optional(),
      reviewId: z.string().optional(),
    }),
  )
  .query(
    async ({ input, ctx }) =>
      await ctx.db.reviewVotes.findFirst({
        where: {
          voterId: input.userId ?? ctx.session.user.id,
          reviewId: input.reviewId,
        },
      }),
  );
