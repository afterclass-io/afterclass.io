import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "@/server/api/trpc";
import { canViewData } from "@/server/ecfg/public-data";
import { censorProfanity } from "@/server/profanity";
import { assertSharedLinkWithinLimit } from "@/server/api/sharing/throttle-shared-link";

export const getSharedRoadmap = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ ctx, input }) => {
    await assertSharedLinkWithinLimit(ctx);
    // PRIVATE rows are excluded in the lookup itself (mirrors getFeedData):
    // a PRIVATE row with a lingering token is invisible, not just refused.
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { shareToken: input.token, visibility: { not: "PRIVATE" } },
      select: {
        id: true,
        name: true,
        user: {
          select: { username: true },
        },
        entries: {
          select: {
            courseId: true,
            yearNumber: true,
            term: true,
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

    // UNLISTED links always need login; PUBLIC ones follow `publicRoadmaps`.
    // Visibility is probed only for anonymous callers, so the page selection
    // stays limited to the fields it uses.
    if (!ctx.session?.user) {
      const isPublic = await ctx.db.userRoadmap.findUnique({
        where: { id: roadmap.id, visibility: "PUBLIC" },
        select: { id: true },
      });
      if (!isPublic || !(await canViewData(null, "publicRoadmaps"))) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }

    const ownerUsername = censorProfanity(roadmap.user.username);

    return {
      roadmap: {
        ...roadmap,
        name: censorProfanity(roadmap.name),
        // Keep the `user` shape but never ship the raw username.
        user: { ...roadmap.user, username: ownerUsername },
      },
      entries: roadmap.entries,
      ownerUsername,
    };
  });
