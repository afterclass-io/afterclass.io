import type { Universities, Professors } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { api } from "@/common/tools/trpc/server";
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

  const session = await auth();
  if (!session) {
    return queryResult.map((r) => ({ ...r, courseCount: 0, reviewCount: 0 }));
  }

  return Promise.all(
    queryResult.map(async (r) => {
      const [courseCount, reviewCount] = await Promise.all([
        api.courses.countByProfSlug({ slug: r.profSlug }),
        api.reviews.count({ profSlug: r.profSlug }),
      ]);
      return {
        ...r,
        courseCount,
        reviewCount,
      };
    }),
  );
}
