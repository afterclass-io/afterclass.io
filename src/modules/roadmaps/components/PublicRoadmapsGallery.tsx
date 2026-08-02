"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Eye, Heart, Search } from "lucide-react";

import { api } from "@/common/tools/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import { Tag } from "@/common/components/tag";
import { Skeleton } from "@/common/components/skeleton";
import { censorProfanity, censorProfanityOrNull } from "@/common/functions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_FACULTIES = "all";
const PAGE_SIZE = 12;

type GallerySort = "newest" | "most-liked" | "most-viewed";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicRoadmapsGallery() {
  // ---- Filter state ----
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [faculty, setFaculty] = useState<string>(ALL_FACULTIES);
  const [sort, setSort] = useState<GallerySort>("newest");

  const query = deferredSearch.trim();
  const hasActiveFilters = query !== "" || faculty !== ALL_FACULTIES;

  // ---- Queries ----
  const { data: faculties } = api.faculties.list.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = api.roadmaps.listPublic.useInfiniteQuery(
    {
      limit: PAGE_SIZE,
      query: query || undefined,
      facultyId: faculty === ALL_FACULTIES ? undefined : Number(faculty),
      sort,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  // ---- Handlers ----
  const clearFilters = () => {
    setSearch("");
    setFaculty(ALL_FACULTIES);
  };

  // ---- Render ----
  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roadmaps…"
            className="w-56 pl-8"
            aria-label="Search roadmaps"
          />
        </div>

        <Select value={faculty} onValueChange={setFaculty}>
          <SelectTrigger aria-label="Filter by faculty">
            <SelectValue placeholder="All faculties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FACULTIES}>All faculties</SelectItem>
            {(faculties ?? []).map((f) => (
              <SelectItem key={f.id} value={String(f.id)}>
                {f.name} ({f.acronym})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as GallerySort)}>
          <SelectTrigger aria-label="Sort roadmaps" data-test="gallery-sort">
            <SelectValue placeholder="Newest" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="most-liked">Most liked</SelectItem>
            <SelectItem value="most-viewed">Most viewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="border-border bg-muted/30 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {error?.message ?? "Failed to load public roadmaps."}
          </p>
        </div>
      )}

      {/* Empty states */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="border-border bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="text-muted-foreground size-10" />
          {hasActiveFilters ? (
            <>
              <p className="text-lg font-semibold">
                No roadmaps match your filters.
              </p>
              <p className="text-muted-foreground text-sm">
                Try a different search term or faculty.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">No public roadmaps yet.</p>
              <p className="text-muted-foreground text-sm">
                Be the first to publish your roadmap!
              </p>
            </>
          )}
        </div>
      )}

      {/* Grid */}
      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.roadmap.id}
              href={`/roadmaps/${item.roadmap.id}`}
              className="group"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="group-hover:text-primary text-lg transition-colors">
                      {censorProfanity(item.roadmap.name)}
                    </CardTitle>
                    {item.faculty && (
                      <Tag
                        variant="soft"
                        color="primary"
                        size="xs"
                        deletable={false}
                        className="shrink-0"
                      >
                        {item.faculty.acronym}
                      </Tag>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.roadmap.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {censorProfanityOrNull(item.roadmap.description)}
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm">
                    by {censorProfanity(item.ownerUsername)}
                  </p>

                  <div className="text-muted-foreground flex items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3" />
                      {item.entryCount}{" "}
                      {item.entryCount === 1 ? "course" : "courses"}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Heart className="size-3" />
                      {item.voteCount}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" />
                      {item.roadmap.viewCount}
                    </span>

                    {item.roadmap.publishedAt && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {new Date(item.roadmap.publishedAt).toLocaleDateString(
                          "en-SG",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
