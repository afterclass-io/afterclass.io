import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { PUBLIC_COURSE_FIELDS } from "../constants";

export const getByCourseCode = publicProcedure
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
