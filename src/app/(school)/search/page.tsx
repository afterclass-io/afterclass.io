import { type Metadata } from "next";

import { ConstrainedContainer } from "@/common/components/constrained-container";
import { SearchResult } from "@/modules/search/components/SearchResult";
import { isShortQuery } from "@/common/constants/search";
import { MAX_QUERY_LEN } from "@/common/tools/query-normalize";
import type { ResultsPage } from "@/server/search/search-results";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  type CourseHit,
  type ProfessorHit,
  searchCourseResults,
  searchProfessorResults,
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

  let initialCourses: ResultsPage<CourseHit> = {
    rows: [],
    totals: { matches: 0, related: 0 },
    nextCursor: null,
  };
  let initialProfessors: ResultsPage<ProfessorHit> = {
    rows: [],
    totals: { matches: 0, related: 0 },
    nextCursor: null,
  };
  // No try/catch: a failed search must reach the (school) error boundary and
  // Sentry's onRequestError hook, not render as "No results found".
  if (!isShortQuery(query)) {
    const session = await auth();
    const withCounts = Boolean(session);
    [initialCourses, initialProfessors] = await Promise.all([
      searchCourseResults(db, {
        query,
        group: "matches",
        limit: 20,
        withCounts,
      }),
      searchProfessorResults(db, {
        query,
        group: "matches",
        limit: 20,
        withCounts,
      }),
    ]);
  }

  return (
    <ConstrainedContainer>
      <SearchResult>
        <SearchResult.Title searchTerm={query} />
        <SearchResult.Content
          query={query}
          initialCourses={initialCourses}
          initialProfessors={initialProfessors}
        />
      </SearchResult>
    </ConstrainedContainer>
  );
}
