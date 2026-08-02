import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { copyRoadmapToUser } from "@/server/api/roadmaps/copyRoadmap";

/**
 * Copy a roadmap that was shared with the caller (via its share token) into
 * the caller's account. Works for private roadmaps too — the share token is
 * the access secret — so recipients of a private share link can adopt the
 * plan for their own use.
 */
export const copyShared = protectedProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const source = await ctx.db.userRoadmap.findUnique({
      where: { shareToken: input.token },
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
