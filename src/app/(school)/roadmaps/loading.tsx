import { PageTitle } from "@/common/components/page-title";
import { Skeleton } from "@/common/components/skeleton";

// Route-level streaming shell for /roadmaps (#523). Mirrors RoadmapsExplorer:
// PageTitle + subtitle + view switcher + the PublicRoadmapsGallery grid.
// Heights are the #519 measured scale — no arbitrary values.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle className="text-left text-2xl font-bold tracking-tight">
            {/* PageTitle heading is text-lg (28px = h-7) / md:text-3xl (36px = h-9). */}
            <Skeleton className="h-7 w-[200px] md:h-9" />
          </PageTitle>
          <Skeleton className="h-5 w-72" />
        </div>
        {/* View switcher: segmented ToggleGroup items (~Button h-9). */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
      {/* PublicRoadmapsGallery cards: rendered Card ≈ 194–210px; h-52 = 208px (#519). */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
