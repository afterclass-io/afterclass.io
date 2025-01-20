import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const count = protectedProcedure
  .input(
    z.object({
      profSlug: z.string().optional(),
      courseCode: z.string().optional(),
    }),
  )
  .query(
    async ({ ctx, input }) =>
      await ctx.db.reviews.count({
        where: {
          reviewedCourse: {
            code: input.courseCode,
          },
          reviewedProfessor: {
            slug: input.profSlug,
          },
        },
      }),
  );
