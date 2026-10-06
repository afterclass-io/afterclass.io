import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedRoadmap } from "@/server/api/ownership";
import { hideRoadmap } from "@/server/api/sharing/hide";

export const unpublish = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await requireOwnedRoadmap(ctx.db, input.roadmapId, ctx.session.user.id, {
      userId: true,
    });

    await hideRoadmap(ctx.db, input.roadmapId);

    return { success: true };
  });
