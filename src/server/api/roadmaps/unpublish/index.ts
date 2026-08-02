import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const unpublish = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    await ctx.db.userRoadmap.update({
      where: { id: input.roadmapId },
      data: {
        visibility: "PRIVATE",
        slug: null,
        publishedAt: null,
        shareToken: null, // prevents old share-link access
      },
    });

    return { success: true };
  });
