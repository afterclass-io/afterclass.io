import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const countByCourseCode = publicProcedure
  .input(z.object({ courseCode: z.string() }))
  .query(
    async ({ input, ctx }) =>
      await ctx.db.reviewLabels.findMany({
        where: {
          review: {
            reviewedCourse: {
              code: input.courseCode,
            },
          },
        },
      }),
  );
