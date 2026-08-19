import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const searchCourses = publicProcedure
  .input(
    z.object({
      acadTermId: z.string(),
      query: z.string().min(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    const results = await ctx.db.courses.findMany({
      where: {
        classes: {
          some: { acadTermId: input.acadTermId },
        },
        OR: [
          { code: { contains: input.query, mode: "insensitive" } },
          { name: { contains: input.query, mode: "insensitive" } },
          {
            classes: {
              some: {
                acadTermId: input.acadTermId,
                professor: {
                  name: { contains: input.query, mode: "insensitive" },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        creditUnits: true,
        classes: {
          where: { acadTermId: input.acadTermId },
          select: {
            id: true,
            section: true,
            professor: { select: { name: true } },
            classTimings: {
              select: {
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                venue: true,
              },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
            classExamTimings: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
                venue: true,
              },
              orderBy: { date: "asc" },
            },
          },
          orderBy: { section: "asc" },
        },
      },
      take: 20,
    });

    return results.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      creditUnits: course.creditUnits,
      sections: course.classes.map((c) => ({
        classId: c.id,
        section: c.section,
        professorName: c.professor?.name ?? null,
        timings: c.classTimings.map((t) => ({
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          venue: t.venue,
        })),
        examTimings: c.classExamTimings.map((t) => ({
          date: t.date,
          startTime: t.startTime,
          endTime: t.endTime,
          venue: t.venue,
        })),
      })),
    }));
  });
