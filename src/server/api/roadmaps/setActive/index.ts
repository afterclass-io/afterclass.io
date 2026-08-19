import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedRoadmap } from "@/server/api/ownership";

/**
 * Mark a roadmap as the user's single active roadmap. Clears `isActive`
 * on all the user's other roadmaps atomically.
 */
export const setActive = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await requireOwnedRoadmap(ctx.db, input.roadmapId, ctx.session.user.id, {
      userId: true,
    });

    await ctx.db.$transaction([
      ctx.db.userRoadmap.updateMany({
        where: { userId: ctx.session.user.id },
        data: { isActive: false },
      }),
      ctx.db.userRoadmap.update({
        where: { id: input.roadmapId },
        data: { isActive: true },
      }),
    ]);

    return { success: true };
  });
