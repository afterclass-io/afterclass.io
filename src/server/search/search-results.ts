import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CourseHit, ProfessorHit } from "./search-service";
import { DEFAULT_UNIVERSITY_ABBRV } from "./search-service";
import { coursePredicates, professorPredicates } from "./predicates";
import { escapeLike, prepareQuery, toCodeKey } from "./query";

export type ResultsInput = {
  query: string;
  group: "matches" | "related";
  cursor?: number;
  limit: number;
  withCounts?: boolean;
};

export type ResultsPage<T> = {
  rows: T[];
  totals: { matches: number; related: number };
  nextCursor: number | null;
};

type Envelope<T> = { rows: T[]; matches: bigint; related: bigint };

function page<T>(
  envelope: Envelope<T> | undefined,
  input: ResultsInput,
): ResultsPage<T> {
  const rows = envelope?.rows ?? [];
  const totals = {
    matches: Number(envelope?.matches ?? 0),
    related: Number(envelope?.related ?? 0),
  };
  const end = (input.cursor ?? 0) + rows.length;
  return {
    rows,
    totals,
    nextCursor: rows.length > 0 && end < totals[input.group] ? end : null,
  };
}

export async function searchCourseResults(
  db: PrismaClient,
  input: ResultsInput,
): Promise<ResultsPage<CourseHit>> {
  const { q, tsQuery, hasQuery } = prepareQuery(input.query);
  if (!hasQuery) return page(undefined, input);
  const { pageKeyword, fuzzy, name, nameText } = coursePredicates(q, tsQuery);
  const qLike = escapeLike(q);
  const codeKey = toCodeKey(q);
  const withCounts = Boolean(input.withCounts);
  const [result] = await db.$queryRaw<Envelope<CourseHit>[]>(Prisma.sql`
    WITH candidates AS (
      SELECT c.id, c.code, c.name, c.credit_units AS "creditUnits", u.abbrv AS "uniAbbrv",
        ${pageKeyword} AS keyword,
        CASE
          WHEN REPLACE(c.code, '-', '') = ${codeKey} THEN 0
          WHEN c.code ILIKE (${qLike} || '%') OR REPLACE(c.code, '-', '') LIKE (${escapeLike(codeKey)} || '%') THEN 1
          WHEN ${name} THEN 2
          WHEN ${nameText} THEN 3
          ELSE 4 END AS tier,
        similarity(c.name, ${q}) AS score
      FROM courses c JOIN universities u ON u.id = c.belong_to_university
      WHERE u.abbrv::text = ${DEFAULT_UNIVERSITY_ABBRV}::text
        AND (${pageKeyword} OR ${fuzzy})
    ), totals AS (
      SELECT COUNT(*) FILTER (WHERE keyword) AS matches,
        COUNT(*) FILTER (WHERE NOT keyword) AS related FROM candidates
    ), selected AS (
      SELECT * FROM candidates WHERE keyword = ${input.group === "matches"}
      ORDER BY CASE WHEN ${input.group === "matches"} THEN tier ELSE 0 END, score DESC, code, id
      LIMIT ${input.limit} OFFSET ${input.cursor ?? 0}
    ), display AS (
      SELECT s.*,
        CASE WHEN ${withCounts} THEN (SELECT COUNT(DISTINCT cl.professor_id)::int FROM classes cl WHERE cl.course_id = s.id) ELSE 0 END AS "profCount",
        CASE WHEN ${withCounts} THEN (SELECT COUNT(*)::int FROM reviews rv WHERE rv.reviewed_course_id = s.id) ELSE 0 END AS "reviewCount"
      FROM selected s
    )
    SELECT totals.*,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', d.id, 'code', d.code, 'name', d.name, 'creditUnits', d."creditUnits", 'uniAbbrv', d."uniAbbrv",
        'profCount', d."profCount", 'reviewCount', d."reviewCount")
        ORDER BY CASE WHEN ${input.group === "matches"} THEN d.tier ELSE 0 END, d.score DESC, d.code, d.id)
        FROM display d), '[]'::jsonb) AS rows
    FROM totals
  `);
  return page(result, input);
}

export async function searchProfessorResults(
  db: PrismaClient,
  input: ResultsInput,
): Promise<ResultsPage<ProfessorHit>> {
  const { q, tsQuery, hasQuery } = prepareQuery(input.query);
  if (!hasQuery) return page(undefined, input);
  const { pageKeyword: keyword, fuzzy } = professorPredicates(q, tsQuery);
  const qLike = escapeLike(q);
  const withCounts = Boolean(input.withCounts);
  const [result] = await db.$queryRaw<Envelope<ProfessorHit>[]>(Prisma.sql`
    WITH candidates AS (
      SELECT p.id, p.slug, p.name, u.abbrv AS "uniAbbrv", ${keyword} AS keyword,
        CASE WHEN LOWER(p.name) = LOWER(${q}) THEN 0
          WHEN p.name ILIKE (${qLike} || '%') THEN 1
          WHEN p.name ILIKE ('%' || ${qLike} || '%') THEN 2 ELSE 3 END AS tier,
        word_similarity(p.name, ${q}) AS score
      FROM professors p JOIN universities u ON u.id = p.belong_to_university
      WHERE u.abbrv::text = ${DEFAULT_UNIVERSITY_ABBRV}::text AND (${keyword} OR ${fuzzy})
    ), totals AS (
      SELECT COUNT(*) FILTER (WHERE keyword) AS matches,
        COUNT(*) FILTER (WHERE NOT keyword) AS related FROM candidates
    ), selected AS (
      SELECT * FROM candidates WHERE keyword = ${input.group === "matches"}
      ORDER BY CASE WHEN ${input.group === "matches"} THEN tier ELSE 0 END, score DESC, name, id
      LIMIT ${input.limit} OFFSET ${input.cursor ?? 0}
    ), display AS (
      SELECT s.*,
        CASE WHEN ${withCounts} THEN (SELECT COUNT(DISTINCT cl.course_id)::int FROM classes cl WHERE cl.professor_id = s.id) ELSE 0 END AS "courseCount",
        CASE WHEN ${withCounts} THEN (SELECT COUNT(*)::int FROM reviews rv WHERE rv.reviewed_professor_id = s.id) ELSE 0 END AS "reviewCount"
      FROM selected s
    )
    SELECT totals.*,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', d.id, 'slug', d.slug, 'name', d.name, 'uniAbbrv', d."uniAbbrv",
        'courseCount', d."courseCount", 'reviewCount', d."reviewCount")
        ORDER BY CASE WHEN ${input.group === "matches"} THEN d.tier ELSE 0 END, d.score DESC, d.name, d.id)
        FROM display d), '[]'::jsonb) AS rows
    FROM totals
  `);
  return page(result, input);
}
