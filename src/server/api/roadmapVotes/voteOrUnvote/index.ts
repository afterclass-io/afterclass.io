import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { voteWeightSchema } from "@/server/api/vote-weight";

export const voteOrUnvote = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      weight: voteWeightSchema,
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
