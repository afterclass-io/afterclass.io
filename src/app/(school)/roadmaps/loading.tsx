import { Card, CardContent, CardHeader } from "@/common/components/card";
import { Skeleton } from "@/common/components/skeleton";

const GALLERY_PAGE_SIZE = 12;

// The page itself only awaits `searchParams` + `auth()`; the gallery is
// client-fetched with its own loading state. This boundary is therefore mostly
// inert for data — it keeps the header, filter bar and grid sized through the
// auth round-trip so navigation in from another route does not flash empty.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header + view switcher */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-5 w-72" />
        </div>
        <Skeleton className="h-9 w-56 rounded-md" />
      </div>

      <div className="flex flex-col gap-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>

        {/* Grid — same card shape as the gallery's own isLoading branch */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: GALLERY_PAGE_SIZE }).map((_, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-5 w-10 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
