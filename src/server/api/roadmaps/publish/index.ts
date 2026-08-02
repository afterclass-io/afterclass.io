import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const publish = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.session.user.isVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only verified users can publish roadmaps",
      });
    }

    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    // Read the faculty live from the DB — the session JWT may be stale
    // (e.g. right after the user declares their faculty).
    const user = await ctx.db.users.findUnique({
      where: { id: ctx.session.user.id },
      select: { facultyId: true },
    });

    await ctx.db.userRoadmap.update({
      where: { id: input.roadmapId },
      data: {
        visibility: "PUBLIC",
        facultyId: user?.facultyId ?? null,
        publishedAt: new Date(),
      },
    });

    return { success: true };
  });
