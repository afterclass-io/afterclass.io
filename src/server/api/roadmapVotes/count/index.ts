import { dataProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const count = dataProcedure("publicRoadmaps")
  .input(
    z.object({
      roadmapId: z.string(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const count = await ctx.db.roadmapVote.aggregate({
      _sum: {
        weight: true,
      },
      where: {
        roadmapId: input.roadmapId,
      },
    });
    return count._sum.weight ?? 0;
  });
