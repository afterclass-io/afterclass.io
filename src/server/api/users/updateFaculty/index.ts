import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

/**
 * Declare (or change) the current user's faculty. Snapshotted onto
 * roadmaps when they are published. Restored alongside per-roadmap
 * `UserRoadmap.facultyId` — global faculty is the default profile
 * faculty, per-roadmap overrides it for gallery pills.
 */
export const updateFaculty = protectedProcedure
  .input(z.object({ facultyId: z.number().int() }))
  .mutation(async ({ ctx, input }) => {
    const faculty = await ctx.db.faculties.findUnique({
      where: { id: input.facultyId },
    });
    if (!faculty) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown faculty" });
    }

    return ctx.db.users.update({
      where: { id: ctx.session.user.id },
      data: { facultyId: input.facultyId },
    });
  });
