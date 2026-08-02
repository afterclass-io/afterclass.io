import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { copyRoadmapToUser } from "../copyRoadmap";

export const copyPublic = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const source = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId, visibility: "PUBLIC" },
      include: {
        entries: {
          select: {
            courseId: true,
            yearNumber: true,
            term: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return copyRoadmapToUser(ctx.db, source, ctx.session.user.id);
  });
