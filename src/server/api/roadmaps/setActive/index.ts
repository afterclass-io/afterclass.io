import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

/**
 * Mark a roadmap as the user's single active roadmap. Clears `isActive`
 * on all the user's other roadmaps atomically.
 */
export const setActive = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

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
