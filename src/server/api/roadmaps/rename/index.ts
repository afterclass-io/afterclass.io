import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedRoadmap } from "@/server/api/ownership";

export const rename = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await requireOwnedRoadmap(ctx.db, input.roadmapId, ctx.session.user.id, {
      userId: true,
    });

    return ctx.db.userRoadmap.update({
      where: { id: input.roadmapId },
      data: {
        name: input.name,
        description: input.description,
      },
    });
  });
