import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const remove = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.userRoadmap.delete({
      where: { id: input.roadmapId },
    });
  });
