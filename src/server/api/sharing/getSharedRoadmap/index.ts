import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "@/server/api/trpc";

export const getSharedRoadmap = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { shareToken: input.token },
      include: {
        user: {
          select: { username: true },
        },
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
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      roadmap,
      entries: roadmap.entries,
      ownerUsername: roadmap.user.username,
    };
  });
