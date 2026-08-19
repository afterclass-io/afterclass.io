import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedRoadmap } from "@/server/api/ownership";

export const unpublish = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await requireOwnedRoadmap(ctx.db, input.roadmapId, ctx.session.user.id, {
      userId: true,
    });

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
