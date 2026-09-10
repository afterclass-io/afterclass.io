import { z } from "zod";

import { normalizeSearchQuery } from "@/common/tools/query-normalize";
import { publicProcedure } from "@/server/api/trpc";

import { buildCourseSearchQuery, searchCoursesShared } from "./query";

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
    const q = normalizeSearchQuery(input.query);
    // Min-length guard: no SMU course code is 1 char, so a sub-2-char query is
    // too generic to be useful (it would match `ILIKE '%a%'` on ~every code).
    // Return early, before SQL.
    if (q.length < 2) return [];

    // Ranked fuzzy search through the shared builder (single ranked SQL for
    // both course procedures — see ./query.ts). Ranking: exact/prefix code
    // first, then prefix FTS over code+name+description+courseArea, then
    // trigram name matching + code similarity, then professor-name match in
    // the same acad term. Offered-in-term filter via EXISTS on classes;
    // optional facultyId via c.belong_to_faculty. All parameterized (safe).
    // Timing gate flag: when no day/time filters are given the flag is false
    // and the class_timing EXISTS short-circuits, so courses whose classes
    // have no timings still match, exactly as before. Nulls stand in for
    // omitted filters (Prisma maps null to SQL NULL, unlike undefined).
    const hasTimingFilter =
      input.day !== undefined ||
      input.startsAfter !== undefined ||
      input.endsBefore !== undefined;
    const rows = await searchCoursesShared(
      ctx.db,
      buildCourseSearchQuery({
        acadTermId: input.acadTermId,
        facultyId: input.facultyId,
        hasTimingFilter,
        timing: {
          day: input.day ?? null,
          startsAfter: input.startsAfter ?? null,
          endsBefore: input.endsBefore ?? null,
        },
        q,
      }),
    );

    // Keep the pre-upgrade response shape (sections/timings/exam timings),
    // now fetched in ONE follow-up query instead of per-row.
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
