import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { PROFESSOR_FIELDS } from "../constants";

export const getByCourseCode = publicProcedure
  .input(
    z.object({
      code: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    // No pagination: the course filter renders the full toggle list, so a
    // first-N page would silently drop professors (e.g. 20-professor
    // courses with the old take-10). Result sets are small (tens of rows).
    const professors = await ctx.db.professors.findMany({
      orderBy: { name: "asc" },
      select: {
        ...PROFESSOR_FIELDS,
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
                reviewedCourse: {
                  code: input.code,
                },
              },
            },
          },
        },
        classes: {
          select: {
            courseId: true, // Get course ID to count distinct courses later
          },
        },
      },
      where: {
        classes: {
          some: {
            course: {
              code: input.code,
            },
          },
        },
      },
    });
    const coursesWithDistinctProfessorCount = professors.map((professor) => {
      const uniqueCourses = new Set(
        professor.classes.map((cls) => cls.courseId),
      );
      professor._count.classes = uniqueCourses.size;
      return professor;
    });
    return coursesWithDistinctProfessorCount;
  });
