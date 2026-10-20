import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";

export const countByCourseCode = dataProcedure("courses", "professors")
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
