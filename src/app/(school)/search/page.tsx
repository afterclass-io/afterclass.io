import { type Metadata } from "next";

import { ConstrainedContainer } from "@/common/components/constrained-container";
import { SearchResult } from "@/modules/search/components/SearchResult";
import {
  type SearchCourseResult,
  type SearchProfResult,
} from "@/modules/search/types";
import { MAX_QUERY_LEN } from "@/common/tools/query-normalize";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  DEFAULT_UNIVERSITY_ABBRV,
  searchCourses,
  searchProfessors,
} from "@/server/search/search-service";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // `q` is the query, but this route is noindexed, so the canonical is a
  // formality: the bare search URL is declared anyway.
  alternates: { canonical: "/search" },
};

export default async function Search(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = (searchParams?.q ?? "").slice(0, MAX_QUERY_LEN);

  let searchedCourse: SearchCourseResult[] = [];
  let searchedProf: SearchProfResult[] = [];
  let courseTotal = 0;
  let profTotal = 0;
  // No try/catch: a failed search must reach the (school) error boundary and
  // Sentry's onRequestError hook, not render as "No results found".
  if (query) {
    const session = await auth();
    const withCounts = Boolean(session);
    const [coursesResult, profsResult] = await Promise.all([
      searchCourses(db, {
        query,
        limit: 20,
        cursor: 0,
        withCounts,
        universityAbbrv: DEFAULT_UNIVERSITY_ABBRV,
      }),
      searchProfessors(db, {
        query,
        limit: 20,
        cursor: 0,
        withCounts,
        universityAbbrv: DEFAULT_UNIVERSITY_ABBRV,
      }),
    ]);

    courseTotal = coursesResult.total;
    profTotal = profsResult.total;
    searchedCourse = coursesResult.rows.map((row) => ({
      uniAbbrv: row.uniAbbrv,
      courseCode: row.code,
      courseName: row.name,
      profCount: row.profCount,
      reviewCount: row.reviewCount,
    }));

    searchedProf = profsResult.rows.map((row) => ({
      uniAbbrv: row.uniAbbrv,
      profName: row.name,
      profSlug: row.slug,
      courseCount: row.courseCount,
      reviewCount: row.reviewCount,
    }));
  }

  return (
    <ConstrainedContainer>
      <SearchResult>
        <SearchResult.Title searchTerm={query} />
        <SearchResult.Content
          query={query}
          courseTotal={courseTotal}
          profTotal={profTotal}
          searchedCourse={searchedCourse}
          searchedProf={searchedProf}
        />
      </SearchResult>
    </ConstrainedContainer>
  );
}
