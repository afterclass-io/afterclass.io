import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

/**
 * Declare the matriculation acad term (the user's Y1T1) for a roadmap.
 * Pass `null` to clear the declaration.
 */
export const setMatricTerm = protectedProcedure
  .input(
    z.object({
      roadmapId: z.string(),
      matricTermId: z.string().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const roadmap = await ctx.db.userRoadmap.findUnique({
      where: { id: input.roadmapId },
    });

    if (!roadmap || roadmap.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    if (input.matricTermId !== null) {
      const term = await ctx.db.acadTerm.findUnique({
        where: { id: input.matricTermId },
      });
      if (!term) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown academic term",
        });
      }
    }

    return ctx.db.userRoadmap.update({
      where: { id: input.roadmapId },
      data: { matricTermId: input.matricTermId },
    });
  });
