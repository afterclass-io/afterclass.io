import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const countByCourseCode = publicProcedure
  .input(z.object({ courseCode: z.string() }))
  .query(
    async ({ input, ctx }) =>
      await ctx.db.professors.count({
        where: {
          classes: {
            some: {
              course: {
                code: input.courseCode,
              },
            },
          },
        },
      }),
  );
