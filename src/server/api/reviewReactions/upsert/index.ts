import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { ReviewReactionType } from "@prisma/client";

export const upsert = protectedProcedure
  .input(
    z.object({
      reviewId: z.string(),
      userId: z.string().optional(),
      reaction: z.nativeEnum(ReviewReactionType).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const reactingUserId = input.userId ?? ctx.session.user.id;

    if (!input.reaction) {
      return await ctx.db.reviewReactions.delete({
        where: {
          reviewId_reactingUserId: {
            reactingUserId,
            reviewId: input.reviewId,
          },
        },
      });
    }

    return await ctx.db.reviewReactions.upsert({
      where: {
        reviewId_reactingUserId: {
          reactingUserId,
          reviewId: input.reviewId,
        },
      },
      create: {
        reactingUserId,
        reviewId: input.reviewId,
        reaction: input.reaction,
      },
      update: {
        reaction: input.reaction,
      },
    });
  });
