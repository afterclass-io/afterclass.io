import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";
import { PUBLIC_COURSE_FIELDS } from "../constants";

export const getByCourseCode = dataProcedure("courses")
  .input(z.object({ code: z.string() }))
  .query(
    async ({ ctx, input }) =>
      await ctx.db.courses.findUnique({
        select: PUBLIC_COURSE_FIELDS,
        where: {
          code: input.code,
        },
      }),
  );

export type getByCourseCodeResolved = Awaited<
  ReturnType<typeof getByCourseCode>
>;
