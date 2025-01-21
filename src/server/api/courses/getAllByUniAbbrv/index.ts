import { z } from "zod";
import { type Prisma, UniversityAbbreviation } from "@prisma/client";

import { publicProcedure } from "@/server/api/trpc";

export const getAllByUniAbbrv = publicProcedure
  .input(
    z.object({
      universityAbbrv: z.nativeEnum(UniversityAbbreviation),
    }),
  )
  .query(async ({ ctx, input }) => {
    const courses = await ctx.db.courses.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      } satisfies Prisma.CoursesSelect,
      where: {
        belongToUniversity: { abbrv: input.universityAbbrv },
      },
    });
    return courses;
  });
