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
        facultyId: true,
        publishedAt: true,
        viewCount: true,
        shareCount: true,
        user: {
          select: {
            username: true,
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

    // Faculty is per-roadmap via UserRoadmap.facultyId (roadmaps.setFaculty).
    // Seed rows with null facultyId simply render no faculty pill.
    let ownerFaculty: { name: string; acronym: string } | null = null;
    if (roadmap.facultyId !== null) {
      const f = await ctx.db.faculties.findUnique({
        where: { id: roadmap.facultyId },
        select: { name: true, acronym: true },
      });
      ownerFaculty = f ? { name: f.name, acronym: f.acronym } : null;
    }

    return {
      roadmap,
      entries: roadmap.entries,
      ownerUsername: roadmap.user.username,
      ownerFaculty,
      voteCount: roadmap._count.votes,
      viewerHasVoted,
    };
  });
