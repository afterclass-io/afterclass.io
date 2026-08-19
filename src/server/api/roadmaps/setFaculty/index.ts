import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedRoadmap } from "@/server/api/ownership";

/**
 * Set (or clear) the faculty for a specific roadmap.
 * Faculty is per-roadmap so different degree plans can have different
 * faculties. The value is snapshotted for the public gallery — the
 * gallery pill (`UserRoadmap.facultyId`) is the source of truth.
 */
export const setFaculty = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      facultyId: z.number().int().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await requireOwnedRoadmap(ctx.db, input.roadmapId, ctx.session.user.id, {
      userId: true,
    });

    if (input.facultyId !== null) {
      const faculty = await ctx.db.faculties.findUnique({
        where: { id: input.facultyId },
      });
      if (!faculty) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown faculty",
        });
      }
    }

    return ctx.db.userRoadmap.update({
      where: { id: input.roadmapId },
      data: { facultyId: input.facultyId },
    });
  });
