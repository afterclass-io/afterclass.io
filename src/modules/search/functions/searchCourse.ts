import type { Universities, Courses } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { auth } from "@/server/auth";
import { processSearchQuery } from "./processSearchQuery";

type QueryCourseResult = {
  uniAbbrv: Universities["abbrv"];
  courseCode: Courses["code"];
  courseName: Courses["name"];
};

export type SearchCourseResult = QueryCourseResult & {
  profCount: number;
  reviewCount: number;
};

// this is a band-aid solution
// TODO: replace with better search algorithm
export async function searchCourse(
  query: string,
  limit = 5,
): Promise<SearchCourseResult[]> {
  // safety of query is ensured by the Prisma client using prepared statements
  // https://github.com/prisma/prisma-client-js/issues/727#issuecomment-650096790
  const processedQuery = processSearchQuery(query);

  const session = await auth();
  if (!session) {
    // unauthenticated: no counts (previously the count lookups were skipped)
    const queryResult: QueryCourseResult[] = await db.$queryRaw`
      SELECT
        u.abbrv as "uniAbbrv",
        c.code as "courseCode",
        c.name as "courseName"
      FROM
        courses c
      JOIN
        universities u
      ON
        c.belong_to_university = u.id
      WHERE
        to_tsvector(c.code || ' ' || c.name)
        @@ to_tsquery(${processedQuery + ":*"})
      LIMIT ${limit};
    `;
    return queryResult.map((r) => ({ ...r, profCount: 0, reviewCount: 0 }));
  }

  // counts folded into the primary query as grouped aggregates
  return db.$queryRaw<SearchCourseResult[]>`
    SELECT
      u.abbrv as "uniAbbrv",
      c.code as "courseCode",
      c.name as "courseName",
      COUNT(DISTINCT p.id)::int as "profCount",
      COUNT(DISTINCT r.id)::int as "reviewCount"
    FROM
      courses c
    JOIN
      universities u
    ON
      c.belong_to_university = u.id
    LEFT JOIN
      classes cl
    ON
      cl.course_id = c.id
    LEFT JOIN
      professors p
    ON
      p.id = cl.professor_id
    LEFT JOIN
      reviews r
    ON
      r.reviewed_course_id = c.id
    WHERE
      to_tsvector(c.code || ' ' || c.name)
      @@ to_tsquery(${processedQuery + ":*"})
    GROUP BY
      u.abbrv, c.code, c.name
    LIMIT ${limit};
  `;
}
