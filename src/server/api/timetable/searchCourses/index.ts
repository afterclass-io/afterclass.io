import { z } from "zod";

import { normalizeSearchQuery } from "@/common/tools/query-normalize";
import { publicProcedure } from "@/server/api/trpc";

type SearchRow = {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
};

export const searchCourses = publicProcedure
  .input(
    z.object({
      acadTermId: z.string(),
      query: z.string().min(1),
      facultyId: z.number().int().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const q = normalizeSearchQuery(input.query);
    // Min-length guard: no SMU course code is 1 char, so a sub-2-char query is
    // too generic to be useful (it would match `ILIKE '%a%'` on ~every code).
    // Return early, before SQL.
    if (q.length < 2) return [];

    // Ranked fuzzy search: exact/prefix code first, then prefix FTS over
    // code+name+description+courseArea (`:*` restores the pre-upgrade prefix
    // behavior), then trigram name matching - word_similarity gives
    // best-word typo tolerance ("statistics" matches "Statistical Analysis")
    // + code similarity for spaced/dashed codes, then professor-name match
    // in the same acad term (mirrors the pre-upgrade `classes.some({
    // acadTermId, professor: { name: contains } })` branch). Offered-in-term
    // filter via EXISTS on classes. Optional facultyId via c.belong_to_faculty
    // and description/courseArea via word_similarity + FTS COALESCE.
    // Parameterized - safe (prepared statement).
    const hasFaculty = typeof input.facultyId === "number";
    const rows = hasFaculty
      ? await ctx.db.$queryRaw<SearchRow[]>`
      SELECT c.id, c.code, c.name, c.credit_units AS "creditUnits"
      FROM courses c
      WHERE c.belong_to_faculty = ${input.facultyId}
      AND EXISTS (
        SELECT 1 FROM classes cl
        WHERE cl.course_id = c.id AND cl.acad_term_id = ${input.acadTermId}
      )
      AND (
        c.code ILIKE ('%' || ${q} || '%')
        OR to_tsvector('simple', c.code || ' ' || c.name || ' ' || COALESCE(c.description,'') || ' ' || COALESCE(c.course_area,''))
           @@ plainto_tsquery('simple', ${q} || ':*')
        OR word_similarity(c.name, ${q}) > 0.3
        OR word_similarity(COALESCE(c.description,''), ${q}) > 0.3
        OR word_similarity(COALESCE(c.course_area,''), ${q}) > 0.3
        OR similarity(c.code, ${q}) > 0.3
        OR EXISTS (
          SELECT 1 FROM classes clp
          JOIN professors p ON p.id = clp.professor_id
          WHERE clp.course_id = c.id
            AND clp.acad_term_id = ${input.acadTermId}
            AND (
              p.name ILIKE ('%' || ${q} || '%')
              OR word_similarity(p.name, ${q}) > 0.3
            )
        )
      )
      ORDER BY
        (c.code ILIKE (${q} || '%'))::int DESC,
        similarity(c.name, ${q}) DESC,
        c.code
      LIMIT 20;
    `
      : await ctx.db.$queryRaw<SearchRow[]>`
      SELECT c.id, c.code, c.name, c.credit_units AS "creditUnits"
      FROM courses c
      WHERE EXISTS (
        SELECT 1 FROM classes cl
        WHERE cl.course_id = c.id AND cl.acad_term_id = ${input.acadTermId}
      )
      AND (
        c.code ILIKE ('%' || ${q} || '%')
        OR to_tsvector('simple', c.code || ' ' || c.name || ' ' || COALESCE(c.description,'') || ' ' || COALESCE(c.course_area,''))
           @@ plainto_tsquery('simple', ${q} || ':*')
        OR word_similarity(c.name, ${q}) > 0.3
        OR word_similarity(COALESCE(c.description,''), ${q}) > 0.3
        OR word_similarity(COALESCE(c.course_area,''), ${q}) > 0.3
        OR similarity(c.code, ${q}) > 0.3
        OR EXISTS (
          SELECT 1 FROM classes clp
          JOIN professors p ON p.id = clp.professor_id
          WHERE clp.course_id = c.id
            AND clp.acad_term_id = ${input.acadTermId}
            AND (
              p.name ILIKE ('%' || ${q} || '%')
              OR word_similarity(p.name, ${q}) > 0.3
            )
        )
      )
      ORDER BY
        (c.code ILIKE (${q} || '%'))::int DESC,
        similarity(c.name, ${q}) DESC,
        c.code
      LIMIT 20;
    `;

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
