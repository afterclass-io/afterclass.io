import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import * as searchService from "@/server/search/search-service";

export const searchCourses = publicProcedure
  .input(
    z.object({
      acadTermId: z.string(),
      query: z.string().min(1).max(200),
      facultyId: z.number().int().optional(),
      // Same meeting-time semantics as classes.getAll: one class_timing row
      // must satisfy every provided condition (day equality, start >=, end <=).
      day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).optional(),
      startsAfter: z.string().optional(), // "18:00"
      endsBefore: z.string().optional(), // "22:00"
    }),
  )
  .query(async ({ ctx, input }) => {
    const hasTimingFilter =
      input.day !== undefined ||
      input.startsAfter !== undefined ||
      input.endsBefore !== undefined;
    const { rows } = await searchService.searchCourses(ctx.db, {
      query: input.query,
      limit: 20,
      acadTermId: input.acadTermId,
      facultyId: input.facultyId,
      timing: hasTimingFilter
        ? {
            day: input.day,
            startsAfter: input.startsAfter,
            endsBefore: input.endsBefore,
          }
        : undefined,
    });

    const courseIds = rows.map((r) => r.id);
    const classes = courseIds.length
      ? await ctx.db.classes.findMany({
          where: { acadTermId: input.acadTermId, courseId: { in: courseIds } },
          select: {
            id: true,
            courseId: true,
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
        })
      : [];

    const classesByCourse = new Map<string, typeof classes>();
    for (const cl of classes) {
      const list = classesByCourse.get(cl.courseId) ?? [];
      list.push(cl);
      classesByCourse.set(cl.courseId, list);
    }

    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      creditUnits: c.creditUnits,
      sections: (classesByCourse.get(c.id) ?? []).map((cl) => ({
        classId: cl.id,
        section: cl.section,
        professorName: cl.professor?.name ?? null,
        timings: cl.classTimings.map((t) => ({
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          venue: t.venue,
        })),
        examTimings: cl.classExamTimings.map((t) => ({
          date: t.date,
          startTime: t.startTime,
          endTime: t.endTime,
          venue: t.venue,
        })),
      })),
    }));
  });
