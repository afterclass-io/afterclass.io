import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";

const HARD_LIMIT = 200;

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

    return await ctx.db.bidResult.findMany({
      where: {
        class: {
          courseId: course.id,
          professorId: input.professorId,
        },
      },
      include: {
        bidWindow: true,
        class: {
          include: {
            professor: { select: { name: true } },
            course: { select: { code: true, name: true } },
            classTimings: {
              select: { dayOfWeek: true, startTime: true, endTime: true },
              orderBy: { startTime: "asc" },
            },
          },
        },
      },
      orderBy: [
        { bidWindow: { acadTermId: "desc" } },
        { bidWindow: { round: "asc" } },
        { bidWindow: { window: "asc" } },
      ],
      take: HARD_LIMIT,
    });
  });
