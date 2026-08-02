"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { Search, Loader2 } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { selectedTermIdAtom } from "@/modules/timetable/atoms/timetable";
import { Input } from "@/common/components/input";
import { Skeleton } from "@/common/components/skeleton";
import { cn } from "@/common/functions";
import { useDebouncedValue } from "@/common/hooks/useDebouncedValue";
import { SectionPicker, type SectionOption } from "./SectionPicker";

export type CourseSearchPanelProps = {
  /** Set of course codes currently in the active timetable (for swap detection). */
  timetableCourseCodes: Set<string>;
  className?: string;
};

/**
 * Search panel for finding courses in the selected term and adding their
 * sections to the active timetable.
 *
 * Features:
 * - Debounced search (300 ms) via `timetable.searchCourses`
 * - Results list showing course code, name, credit units
 * - Clicking a result expands the SectionPicker for that course
 */
export function CourseSearchPanel({
  timetableCourseCodes,
  className,
}: CourseSearchPanelProps) {
  const selectedTermId = useAtomValue(selectedTermIdAtom);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Clear stale search state when the term changes — results are term-scoped
  useEffect(() => {
    setQuery("");
    setExpandedCourseId(null);
  }, [selectedTermId]);

  const searchQuery = api.timetable.searchCourses.useQuery(
    {
      acadTermId: selectedTermId ?? "",
      query: debouncedQuery,
    },
    {
      enabled: !!selectedTermId && debouncedQuery.length >= 1,
      staleTime: 30_000,
    },
  );

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const handleExpand = useCallback((courseId: string) => {
    setExpandedCourseId((prev) => (prev === courseId ? null : courseId));
  }, []);

  // Derive rich section data for the expanded course
  const expandedCourse = useMemo(
    () => results.find((c) => c.id === expandedCourseId),
    [results, expandedCourseId],
  );

  const expandedSections: SectionOption[] = useMemo(
    () =>
      expandedCourse?.sections.map((s) => ({
        classId: s.classId,
        section: s.section,
        professorName: s.professorName,
        timings: s.timings,
        examTimings: s.examTimings,
      })) ?? [],
    [expandedCourse],
  );

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {/* Search input (fixed, outside the scroll region) */}
      <div className="relative shrink-0">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          data-test="timetable-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, name or professor…"
          className="pl-9"
          disabled={!selectedTermId}
        />
        {searchQuery.isFetching && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {/* Scrollable body — results scroll inside the panel, not the page */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {/* Empty state */}
        {!selectedTermId && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Pick a term to start searching.
          </p>
        )}

        {selectedTermId && !debouncedQuery && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Type a course code, name or professor to get started.
          </p>
        )}

        {/* Loading skeleton */}
        {searchQuery.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Results ({results.length})
            </p>
            {results.map((course) => (
              <div key={course.id}>
                <button
                  type="button"
                  onClick={() => handleExpand(course.id)}
                  className={cn(
                    "border-border bg-card hover:bg-accent w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                    expandedCourseId === course.id && "ring-ring ring-1",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{course.code}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {course.creditUnits} CU
                    </span>
                  </div>
                  {/* Wraps to multiple lines — no truncation */}
                  <p className="text-muted-foreground text-xs break-words">
                    {course.name}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {course.sections.length} section
                    {course.sections.length !== 1 ? "s" : ""}
                  </p>
                </button>

                {/* Expanded section picker */}
                {expandedCourseId === course.id && (
                  <div className="border-border mt-1 ml-4 border-l pl-4">
                    <SectionPicker
                      courseId={course.id}
                      courseCode={course.code}
                      alreadyInTimetable={timetableCourseCodes.has(course.code)}
                      sections={expandedSections}
                      onDone={() => setExpandedCourseId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {debouncedQuery && !searchQuery.isLoading && results.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No courses found for &quot;{debouncedQuery}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
