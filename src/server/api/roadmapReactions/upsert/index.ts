import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { ReviewReactionType } from "@/generated/prisma/client";

export const upsert = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      reaction: z.nativeEnum(ReviewReactionType).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const reactingUserId = ctx.session.user.id;

    // workaround for deleteIfExists // https://github.com/prisma/prisma/issues/9460
    if (!input.reaction) {
      return await ctx.db.roadmapReaction.deleteMany({
        where: {
          userId: reactingUserId,
          roadmapId: input.roadmapId,
        },
      });
    }

    return await ctx.db.roadmapReaction.upsert({
      where: {
        roadmapId_userId: {
          userId: reactingUserId,
          roadmapId: input.roadmapId,
        },
      },
      create: {
        userId: reactingUserId,
        roadmapId: input.roadmapId,
        reaction: input.reaction,
      },
      update: {
        reaction: input.reaction,
      },
    });
  });
