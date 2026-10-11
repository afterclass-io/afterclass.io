"use client";

import { keepPreviousData } from "@tanstack/react-query";

import { MIN_QUERY_LEN, SEARCH_DEBOUNCE_MS } from "@/common/constants/search";
import { useDebouncedValue } from "@/common/hooks/useDebouncedValue";
import { api, type RouterOutputs } from "@/common/tools/trpc/react";

export type CourseCatalogRow =
  RouterOutputs["search"]["courses"]["rows"][number];
export type ProfessorCatalogRow =
  RouterOutputs["search"]["professors"]["rows"][number];

type Scope =
  | { entity: "course"; scope?: { professorSlug: string } }
  | { entity: "professor"; scope?: { courseCode: string } };

export type UseSearchCatalogArgs = Scope & {
  query: string;
  limit?: number;
  enabled?: boolean;
};

export function useSearchCatalog(args: {
  entity: "course";
  scope?: { professorSlug: string };
  query: string;
  limit?: number;
  enabled?: boolean;
}): {
  rows: CourseCatalogRow[];
  total: number;
  debouncedQuery: string;
  isFetching: boolean;
  isStale: boolean;
  isIdle: boolean;
};
export function useSearchCatalog(args: {
  entity: "professor";
  scope?: { courseCode: string };
  query: string;
  limit?: number;
  enabled?: boolean;
}): {
  rows: ProfessorCatalogRow[];
  total: number;
  debouncedQuery: string;
  isFetching: boolean;
  isStale: boolean;
  isIdle: boolean;
};
export function useSearchCatalog(args: UseSearchCatalogArgs): {
  rows: (CourseCatalogRow | ProfessorCatalogRow)[];
  total: number;
  debouncedQuery: string;
  isFetching: boolean;
  isStale: boolean;
  isIdle: boolean;
};
export function useSearchCatalog(args: UseSearchCatalogArgs) {
  const { query, limit = 10, enabled = true } = args;
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);

  const hasScope =
    args.entity === "course"
      ? Boolean(args.scope?.professorSlug)
      : Boolean(args.scope?.courseCode);

  const shouldQuery =
    enabled && (debouncedQuery.length >= MIN_QUERY_LEN || hasScope);

  const courseQuery = api.search.courses.useQuery(
    {
      query: debouncedQuery,
      scope:
        args.entity === "course" && args.scope?.professorSlug
          ? args.scope
          : undefined,
      limit,
    },
    {
      enabled: args.entity === "course" && shouldQuery,
      placeholderData: keepPreviousData,
      staleTime: 30_000,
    },
  );

  const profQuery = api.search.professors.useQuery(
    {
      query: debouncedQuery,
      scope:
        args.entity === "professor" && args.scope?.courseCode
          ? args.scope
          : undefined,
      limit,
    },
    {
      enabled: args.entity === "professor" && shouldQuery,
      placeholderData: keepPreviousData,
      staleTime: 30_000,
    },
  );

  const activeQuery = args.entity === "course" ? courseQuery : profQuery;
  const isStale =
    trimmedQuery !== debouncedQuery || Boolean(activeQuery.isPlaceholderData);

  return {
    rows: shouldQuery ? (activeQuery.data?.rows ?? []) : [],
    total: activeQuery.data?.total ?? 0,
    debouncedQuery,
    isFetching: activeQuery.isFetching,
    isStale,
    isIdle: !shouldQuery,
  };
}
