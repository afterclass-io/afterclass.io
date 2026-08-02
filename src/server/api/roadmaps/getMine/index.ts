import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const getMine = protectedProcedure
  .input(z.object({ roadmapId: z.string() }))
  .query(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: {
        id: input.roadmapId,
        userId: ctx.session.user.id,
      },
      include: {
        entries: {
          include: {
            course: {
              select: {
                code: true,
                name: true,
                creditUnits: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!roadmap) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return { roadmap, entries: roadmap.entries };
  });
