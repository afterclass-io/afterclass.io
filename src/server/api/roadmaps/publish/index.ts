import { z } from "zod";

import { verifiedProcedure } from "@/server/api/trpc";
import { requireOwnedRoadmap } from "@/server/api/ownership";

export const publish = verifiedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
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
