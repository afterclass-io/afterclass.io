import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "@/server/api/trpc";

export const getById = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: {
        id: input.id,
        visibility: "PUBLIC",
      },
      // Intentionally omits shareToken — it's an access secret, not display data.
      select: {
        id: true,
        name: true,
        description: true,
        userId: true,
        publishedAt: true,
        viewCount: true,
        shareCount: true,
        user: {
          select: {
            username: true,
            faculty: {
              select: { name: true, acronym: true },
            },
          },
        },
        entries: {
          select: {
            id: true,
            courseId: true,
            yearNumber: true,
            term: true,
            sortOrder: true,
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
        _count: {
          select: { votes: { where: { weight: 1 } } },
        },
      },
    });

    if (!roadmap) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Whether the (possibly anonymous) viewer has already upvoted.
    const viewerHasVoted = ctx.session?.user
      ? !!(await ctx.db.roadmapVote.findUnique({
          where: {
            roadmapId_userId: {
              roadmapId: roadmap.id,
              userId: ctx.session.user.id,
            },
            weight: 1,
          },
          select: { id: true },
        }))
      : false;

    return {
      roadmap,
      entries: roadmap.entries,
      ownerUsername: roadmap.user.username,
      ownerFaculty: roadmap.user.faculty
        ? {
            name: roadmap.user.faculty.name,
            acronym: roadmap.user.faculty.acronym,
          }
        : null,
      voteCount: roadmap._count.votes,
      viewerHasVoted,
    };
  });
