import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const saveEntries = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      entries: z
        .array(
          z.object({
            courseId: z.string(),
            yearNumber: z.number().int().min(1).max(8),
            term: z.enum(["T1", "T2", "T3A", "T3B"]),
            sortOrder: z.number().int().min(0).max(99),
          }),
        )
        .max(100),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.userRoadmapEntry.deleteMany({
        where: { roadmapId: input.roadmapId },
      });
      await tx.userRoadmapEntry.createMany({
        data: input.entries.map((e) => ({ ...e, roadmapId: input.roadmapId })),
      });
    });

    return { count: input.entries.length };
  });
