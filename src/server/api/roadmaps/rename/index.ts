import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const rename = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.userRoadmap.update({
      where: { id: input.roadmapId },
      data: {
        name: input.name,
        description: input.description,
      },
    });
  });
