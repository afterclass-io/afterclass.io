import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { DEFAULT_PAGE_SIZE, PUBLIC_COURSE_FIELDS } from "../constants";

export const getByProfSlug = publicProcedure
  .input(
    z.object({
      page: z.number().default(1),
      slug: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const courses = await ctx.db.courses.findMany({
      skip: DEFAULT_PAGE_SIZE * (input.page - 1),
      take: DEFAULT_PAGE_SIZE,
      select: {
        ...PUBLIC_COURSE_FIELDS,
        _count: {
          select: {
            /**
             * unfortunately, we can't rely `classes: true` here and have to
             * count manually with a Set.
             * prisma doesn't support count distinct natively.
             * see prisma issue 4228
             */
            classes: true,
            reviews: {
              where: {
                reviewedProfessor: { slug: input.slug },
              },
            },
          },
        },
        classes: {
          select: {
            professor: {
              select: {
                id: true, // Get professor ID to count distinct professors later
              },
            },
          },
        },
      },
      // see https://www.prisma.io/docs/orm/reference/prisma-client-reference#relation-filters
      // this query can be read as:
      // "get all course where some classes have professor with the given slug"
      where: {
        classes: {
          some: {
            professor: { slug: input.slug },
          },
        },
      },
    });

    const coursesWithDistinctProfessorCount = courses.map((course) => {
      const uniqueProfessors = new Set(
        course.classes.map((cls) => cls.professor.id),
      );
      course._count.classes = uniqueProfessors.size;
      return course;
    });
    return coursesWithDistinctProfessorCount;
  });
