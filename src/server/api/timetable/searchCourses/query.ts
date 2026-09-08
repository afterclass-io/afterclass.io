import type { PrismaClient } from "@prisma/client";

/**
 * Row shape returned by the shared ranked course search. Same output
 * contract as before ({ id, code, name, creditUnits }) so the timetable
 * search UI and the roadmap planner UI both keep working.
 */
export type CourseSearchRow = {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
};

export type CourseSearchTiming = {
  day: string | null;
  startsAfter: string | null;
  endsBefore: string | null;
};

export type BuildCourseSearchQueryArgs = {
  acadTermId?: string;
  facultyId?: number;
  hasTimingFilter: boolean;
  timing: CourseSearchTiming;
  q: string;
};

/**
 * Single ranked fuzzy-search query builder shared by the timetable and
 * roadmaps `searchCourses` procedures (Task 8: search unification).
 *
 * Ranking: exact/prefix code first, then prefix FTS over
 * code+name+description+courseArea, then trigram name matching
 * (word_similarity gives best-word typo tolerance) + code similarity for
 * spaced/dashed codes, then professor-name match (same acad term for the
 * timetable path, any term for the roadmaps catalog path).
 *
 * Offered-in-term filter via EXISTS on classes applies when `acadTermId` is
 * given; the roadmaps catalog path omits it (searches the whole catalog).
 * Optional facultyId via `c.belong_to_faculty`.
 *
 * Timing gate: when `hasTimingFilter` is false the flag short-circuits the
 * class_timing EXISTS, so courses whose classes have no timings still match.
 * Nulls stand in for omitted filters (Prisma maps null to SQL NULL, unlike
 * undefined). Every nullable timing interpolation carries an explicit
 * `::text` cast so Postgres never hits 42P18 on untyped NULL params.
 *
 * All interpolation is Prisma-parameterized (prepared statement) — safe.
 */
/**
 * Flattened, executor-ready form of {@link BuildCourseSearchQueryArgs}.
 * Procedures build this via {@link buildCourseSearchQuery} and run it via
 * {@link searchCoursesShared} — one ranked SQL for both course procedures.
 */
export type BuiltCourseSearchQuery = {
  acadTermId?: string;
  facultyId?: number;
  hasTimingFilter: boolean;
  day: string | null;
  startsAfter: string | null;
  endsBefore: string | null;
  q: string;
};

export function buildCourseSearchQuery({
  acadTermId,
  facultyId,
  hasTimingFilter,
  timing,
  q,
}: BuildCourseSearchQueryArgs): BuiltCourseSearchQuery {
  const { day, startsAfter, endsBefore } = timing;
  return {
    acadTermId,
    facultyId,
    hasTimingFilter,
    day,
    startsAfter,
    endsBefore,
    q,
  };
}

/**
 * Execute the shared ranked course search against a Prisma client.
 * Extracted from the timetable procedure so both course procedures run the
 * SAME SQL (no forked ranking). Parameterized — safe (prepared statement).
 */
export async function searchCoursesShared(
  db: PrismaClient,
  args: BuiltCourseSearchQuery,
): Promise<CourseSearchRow[]> {
  const {
    acadTermId,
    facultyId,
    hasTimingFilter,
    day,
    startsAfter,
    endsBefore,
    q,
  } = args;
  const hasFaculty = typeof facultyId === "number";
  const hasTerm = typeof acadTermId === "string";
  // acadTermId is embedded once per gate (the offered-in-term and timing
  // gates). The professor branch reuses the SAME acadTermId binding when a
  // term is given, so each occurrence must be its own interpolation token
  // (Prisma tag re-emits a $N placeholder per use — never hoist to a const).
  const termId: string | null = hasTerm ? acadTermId : null;

  // Two variants, branch-selected exactly like the pre-unification timetable
  // procedure: faculty-scoped vs unscoped. The roadmaps catalog path calls
  // with `acadTermId: undefined`, in which case the term EXISTS gates are
  // skipped (whole-catalog search) while timing gates still apply when
  // filters are given (they are term-scoped only when a term is present).
  if (hasFaculty) {
    return hasTerm
      ? await db.$queryRaw<CourseSearchRow[]>`
      SELECT c.id, c.code, c.name, c.credit_units AS "creditUnits"
      FROM courses c
      WHERE c.belong_to_faculty = ${facultyId}
      AND EXISTS (
        SELECT 1 FROM classes cl
        WHERE cl.course_id = c.id AND cl.acad_term_id = ${termId}
      )
      AND (
        ${hasTimingFilter} = false
        OR EXISTS (
          SELECT 1 FROM classes clt
          JOIN class_timing ct ON ct.class_id = clt.id
          WHERE clt.course_id = c.id AND clt.acad_term_id = ${termId}
            AND (${day}::text IS NULL OR ct.day_of_week = ${day}::text)
            AND (${startsAfter}::text IS NULL OR ct.start_time >= ${startsAfter}::text)
            AND (${endsBefore}::text IS NULL OR ct.end_time <= ${endsBefore}::text)
        )
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
            AND clp.acad_term_id = ${termId}
            AND (
              p.name ILIKE ('%' || ${q} || '%')
              OR word_similarity(p.name, ${q}) > 0.3
            )
        )
      )
      ORDER BY
        (c.code = UPPER(${q}))::int DESC,
        (c.code ILIKE (${q} || '%'))::int DESC,
        similarity(c.name, ${q}) DESC,
        c.code
      LIMIT 20;
    `
      : await db.$queryRaw<CourseSearchRow[]>`
      SELECT c.id, c.code, c.name, c.credit_units AS "creditUnits"
      FROM courses c
      WHERE c.belong_to_faculty = ${facultyId}
      AND (
        c.code ILIKE ('%' || ${q} || '%')
        OR to_tsvector('simple', c.code || ' ' || c.name || ' ' || COALESCE(c.description,'') || ' ' || COALESCE(c.course_area,''))
           @@ plainto_tsquery('simple', ${q} || ':*')
        OR word_similarity(c.name, ${q}) > 0.3
        OR word_similarity(COALESCE(c.description,''), ${q}) > 0.3
        OR word_similarity(COALESCE(c.course_area,''), ${q}) > 0.3
        OR similarity(c.code, ${q}) > 0.3
      )
      ORDER BY
        (c.code = UPPER(${q}))::int DESC,
        (c.code ILIKE (${q} || '%'))::int DESC,
        similarity(c.name, ${q}) DESC,
        c.code
      LIMIT 20;
    `;
  }
  return hasTerm
    ? await db.$queryRaw<CourseSearchRow[]>`
      SELECT c.id, c.code, c.name, c.credit_units AS "creditUnits"
      FROM courses c
      WHERE EXISTS (
        SELECT 1 FROM classes cl
        WHERE cl.course_id = c.id AND cl.acad_term_id = ${termId}
      )
      AND (
        ${hasTimingFilter} = false
        OR EXISTS (
          SELECT 1 FROM classes clt
          JOIN class_timing ct ON ct.class_id = clt.id
          WHERE clt.course_id = c.id AND clt.acad_term_id = ${termId}
            AND (${day}::text IS NULL OR ct.day_of_week = ${day}::text)
            AND (${startsAfter}::text IS NULL OR ct.start_time >= ${startsAfter}::text)
            AND (${endsBefore}::text IS NULL OR ct.end_time <= ${endsBefore}::text)
        )
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
            AND clp.acad_term_id = ${termId}
            AND (
              p.name ILIKE ('%' || ${q} || '%')
              OR word_similarity(p.name, ${q}) > 0.3
            )
        )
      )
      ORDER BY
        (c.code = UPPER(${q}))::int DESC,
        (c.code ILIKE (${q} || '%'))::int DESC,
        similarity(c.name, ${q}) DESC,
        c.code
      LIMIT 20;
    `
    : await db.$queryRaw<CourseSearchRow[]>`
      SELECT c.id, c.code, c.name, c.credit_units AS "creditUnits"
      FROM courses c
      WHERE (
        c.code ILIKE ('%' || ${q} || '%')
        OR to_tsvector('simple', c.code || ' ' || c.name || ' ' || COALESCE(c.description,'') || ' ' || COALESCE(c.course_area,''))
           @@ plainto_tsquery('simple', ${q} || ':*')
        OR word_similarity(c.name, ${q}) > 0.3
        OR word_similarity(COALESCE(c.description,''), ${q}) > 0.3
        OR word_similarity(COALESCE(c.course_area,''), ${q}) > 0.3
        OR similarity(c.code, ${q}) > 0.3
      )
      ORDER BY
        (c.code = UPPER(${q}))::int DESC,
        (c.code ILIKE (${q} || '%'))::int DESC,
        similarity(c.name, ${q}) DESC,
        c.code
      LIMIT 20;
    `;
}
