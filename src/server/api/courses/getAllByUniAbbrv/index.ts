import { z } from "zod";
import { type Prisma } from "@/generated/prisma/client";
import { UniversityAbbreviation } from "@/generated/prisma/enums";

import { publicProcedure } from "@/server/api/trpc";

export const getAllByUniAbbrv = publicProcedure
  .input(
    z.object({
      universityAbbrv: z.enum(UniversityAbbreviation),
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
