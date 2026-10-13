import type { PrismaClient } from "@/generated/prisma/client";
import { UniversityAbbreviation } from "@/generated/prisma/enums";
import { escapeLike, prepareQuery, toCodeKey } from "./query";
import { coursePredicates, professorPredicates } from "./predicates";

export { searchCourseResults, searchProfessorResults } from "./search-results";

/** SMU is the only live university. Callers use this value; none hard-codes it. */
export const DEFAULT_UNIVERSITY_ABBRV: UniversityAbbreviation =
  UniversityAbbreviation.SMU;

export type SearchResult<T> = { rows: T[]; total: number };

export type CourseHit = {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
  uniAbbrv: UniversityAbbreviation;
  profCount: number; // 0 unless withCounts
  reviewCount: number; // 0 unless withCounts
};

export type ProfessorHit = {
  id: string;
  slug: string;
  name: string;
  uniAbbrv: UniversityAbbreviation;
  courseCount: number; // 0 unless withCounts
  reviewCount: number; // 0 unless withCounts
};

export type CourseSearchInput = {
  query: string;
  limit: number; // 1..50, set by the caller
  universityAbbrv?: UniversityAbbreviation;
  acadTermId?: string;
  facultyId?: number;
  timing?: { day?: string; startsAfter?: string; endsBefore?: string };
  scope?: { professorSlug: string };
  withCounts?: boolean;
};

export type CourseTermsSearchInput = {
  query: string;
  /** Top-N kept for each term, as one single-term search would keep. */
  limitPerTerm: number;
  acadTermIds: string[];
  facultyId?: number;
};

export type CourseTermsSearchResult = {
  acadTermId: string;
  rows: CourseHit[];
};

export type ProfessorSearchInput = {
  query: string;
  limit: number;
  universityAbbrv?: UniversityAbbreviation;
  scope?: { courseCode: string };
  withCounts?: boolean;
};

type CourseRow = {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
  uniAbbrv: UniversityAbbreviation;
  count: bigint | number;
  profCount?: bigint | number;
  reviewCount?: bigint | number;
};

type CourseTermRow = {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
  uniAbbrv: UniversityAbbreviation;
  acadTermId: string;
};

type ProfessorRow = {
  id: string;
  slug: string;
  name: string;
  uniAbbrv: UniversityAbbreviation;
  count: bigint | number;
  courseCount?: bigint | number;
  reviewCount?: bigint | number;
};

function countIfRequested(
  requested: boolean,
  count: bigint | number | undefined,
) {
  return requested ? Number(count ?? 0) : 0;
}

function exactCodeMatches(rows: CourseHit[], codeKey: string) {
  return rows.filter((r) => toCodeKey(r.code) === codeKey);
}

export async function searchCourses(
  db: PrismaClient,
  input: CourseSearchInput,
): Promise<SearchResult<CourseHit>> {
  const { q, tsQuery, hasQuery } = prepareQuery(input.query);
  const codeKey = toCodeKey(q);
  const { keyword, fuzzy } = coursePredicates(q, tsQuery);

  if (!hasQuery && !input.scope) {
    return { rows: [], total: 0 };
  }

  const qLike = escapeLike(q);
  const codeKeyLike = escapeLike(codeKey);

  const universityAbbrv = input.universityAbbrv ?? null;
  const facultyId = input.facultyId ?? null;
  const acadTermId = input.acadTermId ?? null;
  const professorSlug = input.scope?.professorSlug ?? null;
  const hasTimingFilter = Boolean(
    input.timing?.day ?? input.timing?.startsAfter ?? input.timing?.endsBefore,
  );
  const day = input.timing?.day ?? null;
  const startsAfter = input.timing?.startsAfter ?? null;
  const endsBefore = input.timing?.endsBefore ?? null;
  const withCounts = Boolean(input.withCounts);
  const limit = input.limit;

  const rows = await db.$queryRaw<CourseRow[]>`
    WITH hits AS (
      SELECT
        c.id,
        c.code,
        c.name,
        c.credit_units AS "creditUnits",
        u.abbrv AS "uniAbbrv",
        COUNT(*) OVER () AS count,
        ROW_NUMBER() OVER (
          ORDER BY
            (c.code = UPPER(${q}) OR REPLACE(c.code, '-', '') = ${codeKey})::int DESC,
            (c.code ILIKE (${qLike} || '%')
              OR REPLACE(c.code, '-', '') LIKE (${codeKeyLike} || '%'))::int DESC,
            similarity(c.name, ${q}) DESC,
            c.code
        ) AS ord
      FROM courses c
      JOIN universities u ON u.id = c.belong_to_university
      WHERE (${universityAbbrv}::text IS NULL OR u.abbrv::text = ${universityAbbrv}::text)
        AND (${facultyId}::int IS NULL OR c.belong_to_faculty = ${facultyId}::int)
        AND (${acadTermId}::text IS NULL OR EXISTS (
          SELECT 1 FROM classes cl
          WHERE cl.course_id = c.id AND cl.acad_term_id = ${acadTermId}::text
        ))
        AND (${professorSlug}::text IS NULL OR EXISTS (
          SELECT 1 FROM classes cls
          JOIN professors ps ON ps.id = cls.professor_id
          WHERE cls.course_id = c.id AND ps.slug = ${professorSlug}::text
        ))
        AND (
          ${hasTimingFilter}::boolean = false
          OR EXISTS (
            SELECT 1 FROM classes clt
            JOIN class_timing ct ON ct.class_id = clt.id
            WHERE clt.course_id = c.id
              AND (${acadTermId}::text IS NULL OR clt.acad_term_id = ${acadTermId}::text)
              AND (${day}::text IS NULL OR ct.day_of_week = ${day}::text)
              AND (${startsAfter}::text IS NULL OR ct.start_time >= ${startsAfter}::text)
              AND (${endsBefore}::text IS NULL OR ct.end_time <= ${endsBefore}::text)
          )
        )
        AND (
          ${hasQuery}::boolean = false
          OR (
            ${keyword} OR ${fuzzy}
            OR (${acadTermId}::text IS NOT NULL AND EXISTS (
              SELECT 1 FROM classes clp
              JOIN professors p ON p.id = clp.professor_id
              WHERE clp.course_id = c.id
                AND clp.acad_term_id = ${acadTermId}::text
                AND (
                  p.name ILIKE ('%' || ${qLike} || '%')
                  OR word_similarity(p.name, ${q}) > 0.3
                )
            ))
          )
        )
      ORDER BY ord
      LIMIT ${limit}
    )
    SELECT
      h.id, h.code, h.name, h."creditUnits", h."uniAbbrv", h.count,
      CASE WHEN ${withCounts}::boolean
        THEN (SELECT COUNT(DISTINCT cl.professor_id)::int FROM classes cl WHERE cl.course_id = h.id)
        ELSE 0 END AS "profCount",
      CASE WHEN ${withCounts}::boolean
        THEN (SELECT COUNT(*)::int FROM reviews rv WHERE rv.reviewed_course_id = h.id)
        ELSE 0 END AS "reviewCount"
    FROM hits h
    ORDER BY h.ord;
  `;

  const total = Number(rows[0]?.count ?? 0);
  const mappedRows: CourseHit[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    creditUnits: r.creditUnits,
    uniAbbrv: r.uniAbbrv,
    profCount: countIfRequested(withCounts, r.profCount),
    reviewCount: countIfRequested(withCounts, r.reviewCount),
  }));

  if (hasQuery && codeKey) {
    const exact = exactCodeMatches(mappedRows, codeKey);
    if (exact.length > 0) {
      return { rows: exact, total: exact.length };
    }
  }

  return { rows: mappedRows, total };
}

/**
 * Searches the courses offered in each of `acadTermIds` with one query.
 *
 * Each term keeps its own top `limitPerTerm` rows, ranked as `searchCourses`
 * ranks them, so the rows of term T equal those of `searchCourses` with
 * `acadTermId: T`. A single `LIMIT` over all terms would return a different
 * set, so the window is `ROW_NUMBER() OVER (PARTITION BY term ...)`. The
 * result keeps the order of `acadTermIds`; a term without hits has empty rows.
 */
export async function searchCoursesByTerms(
  db: PrismaClient,
  input: CourseTermsSearchInput,
): Promise<CourseTermsSearchResult[]> {
  const { q, tsQuery, hasQuery } = prepareQuery(input.query);
  const codeKey = toCodeKey(q);

  const emptyResult = input.acadTermIds.map((acadTermId) => ({
    acadTermId,
    rows: [],
  }));
  if (!hasQuery || input.acadTermIds.length === 0) return emptyResult;

  const qLike = escapeLike(q);
  const codeKeyLike = escapeLike(codeKey);
  const facultyId = input.facultyId ?? null;
  const limitPerTerm = input.limitPerTerm;
  const { keyword, fuzzy } = coursePredicates(q, tsQuery);

  const rows = await db.$queryRaw<CourseTermRow[]>`
    WITH terms AS (
      SELECT DISTINCT unnest(${input.acadTermIds}::text[]) AS term_id
    ),
    hits AS (
      SELECT
        c.id,
        c.code,
        c.name,
        c.credit_units AS "creditUnits",
        u.abbrv AS "uniAbbrv",
        t.term_id AS "acadTermId",
        ROW_NUMBER() OVER (
          PARTITION BY t.term_id
          ORDER BY
            (c.code = UPPER(${q}) OR REPLACE(c.code, '-', '') = ${codeKey})::int DESC,
            (c.code ILIKE (${qLike} || '%')
              OR REPLACE(c.code, '-', '') LIKE (${codeKeyLike} || '%'))::int DESC,
            similarity(c.name, ${q}) DESC,
            c.code
        ) AS ord
      FROM courses c
      JOIN universities u ON u.id = c.belong_to_university
      CROSS JOIN terms t
      WHERE (${facultyId}::int IS NULL OR c.belong_to_faculty = ${facultyId}::int)
        AND EXISTS (
          SELECT 1 FROM classes cl
          WHERE cl.course_id = c.id AND cl.acad_term_id = t.term_id
        )
        AND (
          ${keyword} OR ${fuzzy}
          OR EXISTS (
            SELECT 1 FROM classes clp
            JOIN professors p ON p.id = clp.professor_id
            WHERE clp.course_id = c.id
              AND clp.acad_term_id = t.term_id
              AND (
                p.name ILIKE ('%' || ${qLike} || '%')
                OR word_similarity(p.name, ${q}) > 0.3
              )
          )
        )
    )
    SELECT h.id, h.code, h.name, h."creditUnits", h."uniAbbrv", h."acadTermId"
    FROM hits h
    WHERE h.ord <= ${limitPerTerm}
    ORDER BY h."acadTermId", h.ord;
  `;

  const rowsByTerm = new Map<string, CourseHit[]>();
  for (const r of rows) {
    const list = rowsByTerm.get(r.acadTermId) ?? [];
    list.push({
      id: r.id,
      code: r.code,
      name: r.name,
      creditUnits: r.creditUnits,
      uniAbbrv: r.uniAbbrv,
      profCount: 0,
      reviewCount: 0,
    });
    rowsByTerm.set(r.acadTermId, list);
  }

  return input.acadTermIds.map((acadTermId) => {
    const termRows = rowsByTerm.get(acadTermId) ?? [];
    // Same exact-code shortcut as `searchCourses`, applied to each term.
    const exact = codeKey ? exactCodeMatches(termRows, codeKey) : [];
    return { acadTermId, rows: exact.length > 0 ? exact : termRows };
  });
}

export async function searchProfessors(
  db: PrismaClient,
  input: ProfessorSearchInput,
): Promise<SearchResult<ProfessorHit>> {
  const { q, tsQuery, hasQuery } = prepareQuery(input.query);
  const { keyword, fuzzy } = professorPredicates(q, tsQuery);

  if (!hasQuery && !input.scope) {
    return { rows: [], total: 0 };
  }

  const qLike = escapeLike(q);
  const universityAbbrv = input.universityAbbrv ?? null;
  const courseCode = input.scope?.courseCode ?? null;
  const withCounts = Boolean(input.withCounts);
  const limit = input.limit;

  const rows = await db.$queryRaw<ProfessorRow[]>`
    WITH hits AS (
      SELECT
        p.id,
        p.slug,
        p.name,
        u.abbrv AS "uniAbbrv",
        COUNT(*) OVER () AS count,
        ROW_NUMBER() OVER (
          ORDER BY
            (p.name ILIKE (${qLike} || '%'))::int DESC,
            word_similarity(p.name, ${q}) DESC,
            p.name
        ) AS ord
      FROM professors p
      JOIN universities u ON u.id = p.belong_to_university
      WHERE (${universityAbbrv}::text IS NULL OR u.abbrv::text = ${universityAbbrv}::text)
        AND (${courseCode}::text IS NULL OR EXISTS (
          SELECT 1 FROM classes cl
          JOIN courses c ON c.id = cl.course_id
          WHERE cl.professor_id = p.id AND c.code = ${courseCode}::text
        ))
        AND (
          ${hasQuery}::boolean = false
          OR (
            ${keyword} OR ${fuzzy}
          )
        )
      ORDER BY ord
      LIMIT ${limit}
    )
    SELECT
      h.id, h.slug, h.name, h."uniAbbrv", h.count,
      CASE WHEN ${withCounts}::boolean
        THEN (SELECT COUNT(DISTINCT cl.course_id)::int FROM classes cl WHERE cl.professor_id = h.id)
        ELSE 0 END AS "courseCount",
      CASE WHEN ${withCounts}::boolean
        THEN (SELECT COUNT(*)::int FROM reviews rv WHERE rv.reviewed_professor_id = h.id)
        ELSE 0 END AS "reviewCount"
    FROM hits h
    ORDER BY h.ord;
  `;

  const total = Number(rows[0]?.count ?? 0);
  const mappedRows: ProfessorHit[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    uniAbbrv: r.uniAbbrv,
    courseCount: countIfRequested(withCounts, r.courseCount),
    reviewCount: countIfRequested(withCounts, r.reviewCount),
  }));

  return { rows: mappedRows, total };
}
