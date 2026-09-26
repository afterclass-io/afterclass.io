import type { Universities, Professors } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { auth } from "@/server/auth";
import { processSearchQuery } from "./processSearchQuery";

type QueryProfResult = {
  uniAbbrv: Universities["abbrv"];
  profName: Professors["name"];
  profSlug: Professors["slug"];
};

export type SearchProfResult = QueryProfResult & {
  courseCount: number;
  reviewCount: number;
};

// this is a band-aid solution
// TODO: replace with better search algorithm
export async function searchProf(
  query: string,
  limit = 5,
): Promise<SearchProfResult[]> {
  // safety of query is ensured by the Prisma client using prepared statements
  // https://github.com/prisma/prisma-client-js/issues/727#issuecomment-650096790
  const processedQuery = processSearchQuery(query);

  const session = await auth();

  // Authenticated searches fold both counts into the primary query as
  // correlated subselects, so a search costs one round trip instead of up to
  // eleven. Anonymous searches skip the count work entirely and stay a single
  // query. `COUNT(DISTINCT c.id)` matches `courses.countByProfSlug`
  // (a course with several matching classes still counts once);
  // `COUNT(*)` on `reviewed_professor_id` matches `reviews.count({ profSlug })`.
  const countColumns = session
    ? Prisma.sql`,
      (
        SELECT COUNT(DISTINCT c.id)::int
        FROM courses c
        JOIN classes cl ON cl.course_id = c.id
        WHERE cl.professor_id = p.id
      ) AS "courseCount",
      (
        SELECT COUNT(*)::int
        FROM reviews r
        WHERE r.reviewed_professor_id = p.id
      ) AS "reviewCount"`
    : Prisma.empty;

  const queryResult: SearchProfResult[] = await db.$queryRaw`
    SELECT
      u.abbrv as "uniAbbrv",
      p.name as "profName",
      p.slug as "profSlug"
      ${countColumns}
    FROM
      professors p
    JOIN
      universities u
    ON
      p.belong_to_university = u.id
    WHERE
      to_tsvector(p.name)
      @@ to_tsquery(${processedQuery + ":*"})
    LIMIT ${limit};
  `;

  if (!session) {
    return queryResult.map((r) => ({ ...r, courseCount: 0, reviewCount: 0 }));
  }

  return queryResult;
}
