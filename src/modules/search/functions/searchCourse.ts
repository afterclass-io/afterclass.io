import type { Universities, Courses } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { api } from "@/common/tools/trpc/server";
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

  const session = await auth();
  if (!session) {
    return queryResult.map((r) => ({ ...r, profCount: 0, reviewCount: 0 }));
  }

  return Promise.all(
    queryResult.map(async (r) => {
      const [profCount, reviewCount] = await Promise.all([
        api.professors.countByCourseCode({ courseCode: r.courseCode }),
        api.reviews.count({ courseCode: r.courseCode }),
      ]);
      return {
        ...r,
        profCount,
        reviewCount,
      };
    }),
  );
}
