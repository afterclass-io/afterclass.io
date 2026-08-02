import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

/**
 * Increment a public roadmap's share counter. Called when someone copies
 * a share/public link to the roadmap.
 */
export const recordShare = publicProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db.userRoadmap.updateMany({
      where: { id: input.roadmapId, visibility: "PUBLIC" },
      data: { shareCount: { increment: 1 } },
    });

    return { success: true };
  });
