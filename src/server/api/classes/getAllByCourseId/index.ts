import { z } from "zod";

import { classesProcedure } from "@/server/api/trpc";
import { PUBLIC_CLASS_FIELDS } from "@/server/api/classes/constants";

export const getAllByCourseId = classesProcedure
  .input(z.object({ courseId: z.string(), acadTermId: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const classes = await ctx.db.classes.findMany({
      select: PUBLIC_CLASS_FIELDS,
      where: {
        courseId: input.courseId,
        acadTermId: input.acadTermId,
      },
      orderBy: {
        acadTermId: "desc",
      },
    });
    return classes;
  });
