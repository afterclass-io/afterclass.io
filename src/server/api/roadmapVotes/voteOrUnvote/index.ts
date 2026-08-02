import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const voteOrUnvote = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      weight: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    }),
  )
  .mutation(
    async ({ input, ctx }) =>
      await ctx.db.roadmapVote.upsert({
        where: {
          roadmapId_userId: {
            roadmapId: input.roadmapId,
            userId: ctx.session.user.id,
          },
        },
        create: {
          roadmapId: input.roadmapId,
          userId: ctx.session.user.id,
          weight: input.weight,
        },
        update: {
          weight: input.weight,
        },
      }),
  );
