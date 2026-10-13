"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type RouterOutputs } from "@/common/tools/trpc/react";
import { isShortQuery } from "@/common/constants/search";
import { Button } from "@/common/components/button";
import { SearchResultFilter } from "../SearchResultFilter";
import { SearchResultEmpty } from "../SearchResultEmpty";
import { ResultsSection } from "./ResultsSection";

type CoursePage = RouterOutputs["search"]["courseResults"];
type ProfessorPage = RouterOutputs["search"]["professorResults"];
type Props = {
  query: string;
  initialCourses: CoursePage;
  initialProfessors: ProfessorPage;
};

export function SearchResultContent(props: Props) {
  if (isShortQuery(props.query)) {
    return <SearchResultEmpty show reason="short" query={props.query} />;
  }
  return <PagedResults key={props.query} {...props} />;
}

function PagedResults({ query, initialCourses, initialProfessors }: Props) {
  const params = useSearchParams();
  const type =
    params.get("type") === "course"
      ? "course"
      : params.get("type") === "professor"
        ? "professor"
        : "all";
  const showCourses = type !== "professor";
  const showProfessors = type !== "course";
  const [expanded, setExpanded] = useState<
    Partial<Record<"all" | "course" | "professor", boolean>>
  >({});

  const courses = api.search.courseResults.useInfiniteQuery(
    { query, group: "matches", limit: 20 },
    {
      initialData: { pages: [initialCourses], pageParams: [undefined] },
      staleTime: 30_000,
      enabled: showCourses,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
  const professors = api.search.professorResults.useInfiniteQuery(
    { query, group: "matches", limit: 20 },
    {
      initialData: { pages: [initialProfessors], pageParams: [undefined] },
      staleTime: 30_000,
      enabled: showProfessors,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
  const courseTotals = courses.data?.pages[0]?.totals ?? initialCourses.totals;
  const professorTotals =
    professors.data?.pages[0]?.totals ?? initialProfessors.totals;
  const matches =
    (showCourses ? courseTotals.matches : 0) +
    (showProfessors ? professorTotals.matches : 0);
  const related =
    (showCourses ? courseTotals.related : 0) +
    (showProfessors ? professorTotals.related : 0);
  const showRelated = expanded[type] ?? (matches === 0 && related > 0);
  const relatedCourses = api.search.courseResults.useInfiniteQuery(
    { query, group: "related", limit: 20 },
    {
      enabled: showRelated && showCourses && courseTotals.related > 0,
      staleTime: 30_000,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
  const relatedProfessors = api.search.professorResults.useInfiniteQuery(
    { query, group: "related", limit: 20 },
    {
      enabled: showRelated && showProfessors && professorTotals.related > 0,
      staleTime: 30_000,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );

  return (
    <div className="flex w-full flex-col gap-8">
      <SearchResultFilter
        values={{ type }}
        filters={{
          type: [
            { label: "All", value: "all", isDefault: true },
            { label: "Professor", value: "professor" },
            { label: "Course", value: "course" },
          ],
        }}
        onValueChange={(_, value) => {
          const next = new URLSearchParams(params.toString());
          if (value === "all") next.delete("type");
          else next.set("type", value);
          window.history.pushState(null, "", `?${next.toString()}`);
        }}
      />
      {matches + related === 0 && (
        <SearchResultEmpty show reason="none" query={query} />
      )}
      {showCourses && courseTotals.matches > 0 && (
        <ResultsSection
          entity="courses"
          total={courseTotals.matches}
          result={courses}
        />
      )}
      {showProfessors && professorTotals.matches > 0 && (
        <ResultsSection
          entity="professors"
          total={professorTotals.matches}
          result={professors}
        />
      )}
      {related > 0 && (
        <section
          className="flex flex-col gap-4 border-t pt-6"
          aria-label="Related matches"
        >
          <Button
            variant="ghost"
            className="h-auto justify-between self-start px-0 text-base"
            aria-expanded={showRelated}
            aria-controls="related-search-results"
            onClick={() =>
              setExpanded((prev) => ({ ...prev, [type]: !showRelated }))
            }
          >
            Related matches ({related}){" "}
            <span aria-hidden="true">{showRelated ? "−" : "+"}</span>
          </Button>
          {showRelated && (
            <div id="related-search-results" className="flex flex-col gap-6">
              <p className="text-muted-foreground text-sm">
                These results have similar wording and may not contain your
                keyword.
              </p>
              {showCourses && courseTotals.related > 0 && (
                <ResultsSection
                  entity="courses"
                  total={courseTotals.related}
                  result={relatedCourses}
                  related
                />
              )}
              {showProfessors && professorTotals.related > 0 && (
                <ResultsSection
                  entity="professors"
                  total={professorTotals.related}
                  result={relatedProfessors}
                  related
                />
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
