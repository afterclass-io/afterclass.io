import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedRoadmap } from "@/server/api/ownership";

export const publish = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.session.user.isVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only verified users can publish roadmaps",
      });
    }

    const roadmap = await requireOwnedRoadmap(
      ctx.db,
      input.roadmapId,
      ctx.session.user.id,
      {
        userId: true,
        facultyId: true,
      },
    );

    await ctx.db.userRoadmap.update({
      where: { id: input.roadmapId },
      data: {
        visibility: "PUBLIC",
        facultyId: roadmap.facultyId,
        publishedAt: new Date(),
      },
    });

    return { success: true };
  });
