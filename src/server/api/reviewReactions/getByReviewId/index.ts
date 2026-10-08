import { ReviewReactionType } from "@/generated/prisma/enums";
import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const getByReviewId = protectedProcedure
  .input(
    z.object({
      reviewId: z.string(),
      eventType: z.enum(ReviewReactionType).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const rows = await ctx.db.reviewReactions.findMany({
      where: {
        reviewId: input.reviewId,
        reaction: input.eventType,
      },
      select: { reaction: true, reactingUserId: true },
    });
    return rows.map((r) => ({
      reaction: r.reaction,
      byViewer: r.reactingUserId === ctx.session.user.id,
    }));
  });
