import { ReviewReactionType } from "@prisma/client";
import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const getByReviewId = protectedProcedure
  .input(
    z.object({
      reviewId: z.string(),
      eventType: z.nativeEnum(ReviewReactionType).optional(),
    }),
  )
  .query(
    async ({ ctx, input }) =>
      await ctx.db.reviewReactions.findMany({
        where: {
          reviewId: input.reviewId,
          reaction: input.eventType,
        },
      }),
  );
