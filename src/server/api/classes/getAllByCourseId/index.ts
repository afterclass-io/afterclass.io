import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { PUBLIC_CLASS_FIELDS } from "@/server/api/classes/constants";

export const getAllByCourseId = publicProcedure
  .input(z.object({ courseId: z.string() }))
  .query(async ({ ctx, input }) => {
    const classes = await ctx.db.classes.findMany({
      select: PUBLIC_CLASS_FIELDS,
      where: {
        courseId: input.courseId,
      },
    });
    return classes;
  });
