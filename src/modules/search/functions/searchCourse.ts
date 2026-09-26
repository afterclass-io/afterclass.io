import type { Universities, Courses } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
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

  // Authenticated searches fold both counts into the primary query as
  // correlated subselects, so a search costs one round trip instead of up to
  // eleven. Anonymous searches skip the count work entirely and stay a single
  // query. `COUNT(DISTINCT p.id)` matches `professors.countByCourseCode`
  // (a professor with several matching classes still counts once);
  // `COUNT(*)` on `reviewed_course_id` matches `reviews.count({ courseCode })`.
  const countColumns = session
    ? Prisma.sql`,
      (
        SELECT COUNT(DISTINCT p.id)::int
        FROM professors p
        JOIN classes cl ON cl.professor_id = p.id
        WHERE cl.course_id = c.id
      ) AS "profCount",
      (
        SELECT COUNT(*)::int
        FROM reviews r
        WHERE r.reviewed_course_id = c.id
      ) AS "reviewCount"`
    : Prisma.empty;

  const queryResult: SearchCourseResult[] = await db.$queryRaw`
    SELECT
      u.abbrv as "uniAbbrv",
      c.code as "courseCode",
      c.name as "courseName"
      ${countColumns}
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

  if (!session) {
    return queryResult.map((r) => ({ ...r, profCount: 0, reviewCount: 0 }));
  }

  return queryResult;
}
