import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { PUBLIC_CLASS_FIELDS } from "@/server/api/classes/constants";

export const getAll = publicProcedure
  .input(
    z.object({
      id: z.string().optional(),
      professorId: z.string().optional(),
      profSlug: z.string().optional(),
      courseId: z.string().optional(),
      courseCode: z.string().optional(),
      section: z.string().optional(),
      acadTermId: z.string().optional(),
      limit: z.number().default(100),
    }),
  )
  .query(async ({ ctx, input }) => {
    const latestAcadTerm = await ctx.db.acadTerm.findFirst({
      orderBy: {
        startDt: "desc",
      },
    });
    const classes = await ctx.db.classes.findMany({
      select: PUBLIC_CLASS_FIELDS,
      where: {
        id: input.id,
        courseId: input.courseId,
        section: input.section,
        acadTermId: input.acadTermId ?? latestAcadTerm?.id,
        professorId: input.professorId,
        professor: {
          slug: input.profSlug,
        },
        course: {
          code: input.courseCode,
        },
      },
      orderBy: [
        {
          acadTermId: "desc",
        },
        {
          section: "asc",
        },
      ],
      // hard limit to prevent too many results
      take: input.limit > 100 ? 100 : input.limit,
    });
    return classes;
  });
