import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { getAcadYearCutoff } from "@/server/api/bidResults/acad-year-window";
import { findBidResults } from "@/server/api/bidResults/findBidResults";

export const getByCourseProfessor = publicProcedure
  .input(
    z.object({
      courseCode: z.string(),
      professorId: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const course = await ctx.db.courses.findUnique({
      where: { code: input.courseCode },
      select: { id: true },
    });

    if (!course) return [];

    // Verify professor exists before querying to avoid silent empty results
    const professor = await ctx.db.professors.findUnique({
      where: { id: input.professorId },
      select: { id: true },
    });

    if (!professor) return [];

    const acadYearCutoff = await getAcadYearCutoff(ctx.db);

    return findBidResults(ctx.db, {
      class: {
        courseId: course.id,
        professorId: input.professorId,
      },
    }, acadYearCutoff);
  });
