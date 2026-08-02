import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const getByUser = protectedProcedure
  .input(
    z.object({
      userId: z.string().optional(),
      roadmapId: z.string().optional(),
    }),
  )
  .query(
    async ({ input, ctx }) =>
      await ctx.db.roadmapVote.findFirst({
        where: {
          userId: input.userId ?? ctx.session.user.id,
          roadmapId: input.roadmapId,
        },
      }),
  );
