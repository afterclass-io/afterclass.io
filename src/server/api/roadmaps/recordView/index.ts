import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

/**
 * Increment a public roadmap's view counter. Called once per public-page
 * view (the client guards against double-fires via sessionStorage).
 */
export const recordView = publicProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db.userRoadmap.updateMany({
      where: { id: input.roadmapId, visibility: "PUBLIC" },
      data: { viewCount: { increment: 1 } },
    });

    return { success: true };
  });
