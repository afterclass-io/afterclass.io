import type { Universities, Professors } from "@/generated/prisma/client";
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
  if (!session) {
    // unauthenticated: no counts (previously the count lookups were skipped)
    const queryResult: QueryProfResult[] = await db.$queryRaw`
      SELECT
        u.abbrv as "uniAbbrv",
        p.name as "profName",
        p.slug as "profSlug"
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
    return queryResult.map((r) => ({ ...r, courseCount: 0, reviewCount: 0 }));
  }

  // counts folded into the primary query as grouped aggregates
  return db.$queryRaw<SearchProfResult[]>`
    SELECT
      u.abbrv as "uniAbbrv",
      p.name as "profName",
      p.slug as "profSlug",
      COUNT(DISTINCT c.id)::int as "courseCount",
      COUNT(DISTINCT r.id)::int as "reviewCount"
    FROM
      professors p
    JOIN
      universities u
    ON
      p.belong_to_university = u.id
    LEFT JOIN
      classes cl
    ON
      cl.professor_id = p.id
    LEFT JOIN
      courses c
    ON
      c.id = cl.course_id
    LEFT JOIN
      reviews r
    ON
      r.reviewed_professor_id = p.id
    WHERE
      to_tsvector(p.name)
      @@ to_tsquery(${processedQuery + ":*"})
    GROUP BY
      u.abbrv, p.name, p.slug
    LIMIT ${limit};
  `;
}
