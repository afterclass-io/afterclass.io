import { publicProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const count = publicProcedure
  .input(
    z.object({
      reviewId: z.string(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const count = await ctx.db.reviewVotes.aggregate({
      _sum: {
        weight: true,
      },
      where: {
        reviewId: input.reviewId,
      },
    });
    return count._sum.weight ?? 0;
  });
