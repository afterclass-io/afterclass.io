"use client";
import { z } from "zod";
import { useRef, useState } from "react";
import {
  type SearchCourseResult,
  type SearchProfResult,
} from "@/modules/search/types";
import {
  BooksIcon,
  GraduationCapIcon,
  PencilIcon,
} from "@/common/components/icons";
import { SearchResultList } from "../SearchResultList";
import { SearchResultItem } from "../SearchResultItem";
import { SearchResultFilter } from "../SearchResultFilter";
import { SearchResultEmpty } from "../SearchResultEmpty";
import { Separator } from "@/common/components/separator";
import { InView } from "react-intersection-observer";
import { api } from "@/common/tools/trpc/react";
import { AfterclassIcon } from "@/common/components/icons";
import { MIN_QUERY_LEN } from "@/common/constants/search";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the schema is used only for its inferred type
const filterOptions = z.object({
  type: z.enum(["all", "professor", "course"]),
});
type FilterOptions = z.infer<typeof filterOptions>;

type Props = {
  query: string;
  searchedCourse: SearchCourseResult[];
  searchedProf: SearchProfResult[];
  courseTotal?: number;
  profTotal?: number;
};

export function SearchResultContent(props: Props) {
  if (props.query.trim().length < MIN_QUERY_LEN) {
    return <SearchResultEmpty show reason="short" query={props.query} />;
  }
  return <PagedResults key={props.query} {...props} />;
}

function PagedResults({
  query,
  searchedCourse,
  searchedProf,
  courseTotal = searchedCourse.length,
  profTotal = searchedProf.length,
}: Props) {
  const [filter, setFilter] = useState<FilterOptions>({ type: "all" });
  const courses = api.search.courseResults.useInfiniteQuery(
    { query, limit: 20 },
    {
      initialData: {
        pages: [
          {
            rows: searchedCourse,
            total: courseTotal,
            nextCursor:
              searchedCourse.length < courseTotal
                ? searchedCourse.length
                : null,
          },
        ],
        pageParams: [undefined],
      },
      staleTime: 30_000,
      gcTime: 0,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
  const professors = api.search.professorResults.useInfiniteQuery(
    { query, limit: 20 },
    {
      initialData: {
        pages: [
          {
            rows: searchedProf,
            total: profTotal,
            nextCursor:
              searchedProf.length < profTotal ? searchedProf.length : null,
          },
        ],
        pageParams: [undefined],
      },
      staleTime: 30_000,
      gcTime: 0,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
  const courseRows = Array.from(
    new Map(
      courses.data?.pages.flatMap((p) => p.rows).map((r) => [r.courseCode, r]),
    ).values(),
  );
  const profRows = Array.from(
    new Map(
      professors.data?.pages.flatMap((p) => p.rows).map((r) => [r.profSlug, r]),
    ).values(),
  );
  const active = {
    course: [courses],
    professor: [professors],
    all: [courses, professors],
  }[filter.type];
  const showCourses = filter.type !== "professor";
  const showProfessors = filter.type !== "course";
  const loadedCount =
    (showCourses ? courseRows.length : 0) +
    (showProfessors ? profRows.length : 0);
  return (
    <div className="flex h-full gap-12">
      <SearchResultList>
        <SearchResultEmpty
          show={loadedCount === 0}
          reason="none"
          query={query}
        />
        {showCourses &&
          courseRows.map((c) => (
            <SearchResultItem
              key={c.courseCode}
              href={`/course/${c.courseCode}`}
              title={c.courseName}
              subtitle={c.courseCode}
              filterStats={[
                { icon: <PencilIcon />, stat: c.reviewCount },
                { icon: <GraduationCapIcon />, stat: c.profCount },
              ]}
            />
          ))}
        {showProfessors &&
          profRows.map((p) => (
            <SearchResultItem
              key={p.profSlug}
              href={`/professor/${p.profSlug}`}
              title={p.profName}
              filterStats={[
                { icon: <PencilIcon />, stat: p.reviewCount },
                { icon: <BooksIcon />, stat: p.courseCount },
              ]}
            />
          ))}
        <SearchResultLoader
          results={active}
          fetching={courses.isFetching || professors.isFetching}
          pageKey={`${courses.data?.pages.length}:${professors.data?.pages.length}:${filter.type}`}
        />
        <span className="sr-only" role="status">
          {loadedCount} results loaded
        </span>
      </SearchResultList>
      <Separator orientation="vertical" className="hidden lg:block" />
      <SearchResultFilter
        onValueChange={(key, value) => {
          setFilter((prev) => ({ ...prev, [key]: value }));
        }}
        filters={{
          type: [
            { label: "All", value: "all", isDefault: true },
            { label: "Professor", value: "professor" },
            { label: "Course", value: "course" },
          ],
        }}
      />
    </div>
  );
}

type Pagination = {
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
};
function SearchResultLoader({
  results,
  fetching,
  pageKey,
}: {
  results: Pagination[];
  fetching: boolean;
  pageKey: string;
}) {
  const loading = useRef(false);
  const failed = results.some((result) => result.isError);
  const hasNext = results.some((result) => result.hasNextPage);
  const loadMore = async () => {
    if (loading.current || fetching) return;
    loading.current = true;
    try {
      await Promise.all(
        results
          .filter((result) => (failed ? result.isError : result.hasNextPage))
          .map((result) =>
            result.isError && !result.isFetchNextPageError
              ? result.refetch()
              : result.fetchNextPage(),
          ),
      );
    } finally {
      loading.current = false;
    }
  };
  if (!hasNext && !failed) return null;
  return (
    <>
      {failed ? (
        <button
          type="button"
          disabled={fetching}
          onClick={() => void loadMore()}
        >
          Search results could not load. Retry
        </button>
      ) : (
        <InView
          key={pageKey}
          as="div"
          className="flex w-full justify-center p-4"
          skip={fetching}
          onChange={(inView) => {
            if (inView) void loadMore();
          }}
        >
          <AfterclassIcon
            size={64}
            className="text-primary/80 animate-pulse transition-colors duration-1500"
          />
        </InView>
      )}
      {!failed && (
        <button
          type="button"
          className="sr-only focus:not-sr-only"
          disabled={fetching}
          onClick={() => void loadMore()}
        >
          Load more results
        </button>
      )}
    </>
  );
}
