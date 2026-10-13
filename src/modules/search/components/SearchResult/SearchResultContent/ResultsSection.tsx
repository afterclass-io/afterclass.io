"use client";

import { useRef } from "react";
import type { RouterOutputs } from "@/common/tools/trpc/react";
import { Button } from "@/common/components/button";
import {
  BooksIcon,
  GraduationCapIcon,
  PencilIcon,
} from "@/common/components/icons";
import { SearchResultItem } from "../SearchResultItem";

type CoursePage = RouterOutputs["search"]["courseResults"];
type ProfessorPage = RouterOutputs["search"]["professorResults"];
type Query<Page> = {
  data?: { pages: Page[] };
  hasNextPage: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
};
type Props = (
  | { entity: "courses"; result: Query<CoursePage> }
  | { entity: "professors"; result: Query<ProfessorPage> }
) & { total: number; related?: boolean };

export function ResultsSection({
  entity,
  result,
  total,
  related = false,
}: Props) {
  const loading = useRef(false);
  const pages: (CoursePage | ProfessorPage)[] = result.data?.pages ?? [];
  const allRows = pages.flatMap<
    CoursePage["rows"][number] | ProfessorPage["rows"][number]
  >((p) => p.rows);
  const rows = [...new Map(allRows.map((r) => [r.id, r])).values()];
  const label = related ? `related ${entity}` : entity;
  const title = `${related ? "Related " : ""}${entity === "courses" ? "Courses" : "Professors"}`;
  const load = async () => {
    if (loading.current || result.isFetching) return;
    loading.current = true;
    try {
      if (result.isError && !result.isFetchNextPageError)
        await result.refetch();
      else await result.fetchNextPage();
    } finally {
      loading.current = false;
    }
  };
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p
          className="text-muted-foreground text-sm"
          role="status"
          aria-live="polite"
        >
          Showing {rows.length} of {total} {label}
        </p>
      </div>
      {result.isLoading && (
        <p className="text-muted-foreground text-sm" role="status">
          Loading {label}…
        </p>
      )}
      {rows.map((row) => (
        <SearchResultItem
          key={row.id}
          href={
            "code" in row ? `/course/${row.code}` : `/professor/${row.slug}`
          }
          title={row.name}
          subtitle={"code" in row ? row.code : undefined}
          filterStats={[
            { icon: <PencilIcon />, stat: row.reviewCount },
            "code" in row
              ? { icon: <GraduationCapIcon />, stat: row.profCount }
              : { icon: <BooksIcon />, stat: row.courseCount },
          ]}
        />
      ))}
      {result.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p>Couldn’t load {label}. Please try again.</p>
          <Button
            variant="outline"
            disabled={result.isFetching}
            onClick={() => void load()}
            aria-label={`Retry ${label}`}
          >
            Retry
          </Button>
        </div>
      )}
      {!result.isError && result.hasNextPage && (
        <Button
          variant="outline"
          className="self-start"
          disabled={result.isFetching}
          onClick={() => void load()}
          aria-label={`Load more ${label}`}
        >
          {result.isFetching ? "Loading…" : "Load more"}
        </Button>
      )}
    </section>
  );
}
