import { ConstrainedContainer } from "@/common/components/constrained-container";
import { Separator } from "@/common/components/separator";
import { Skeleton } from "@/common/components/skeleton";
import { SearchResult } from "@/modules/search/components/SearchResult";

// Result row mirrors SearchResultItem's `bg-card flex h-fit w-full ...`
// outline link. The filter rail mirrors SearchResultFilter's
// `sticky top-24 hidden ... lg:flex` column.
const ResultRowSkeleton = () => (
  <div className="bg-card flex h-fit w-full items-center justify-between gap-2 rounded-lg border p-3 md:gap-4 md:p-4">
    <div className="flex flex-[1_0_0%] flex-col items-start justify-center space-y-2 md:space-y-4">
      <div className="flex items-center gap-4 self-stretch">
        <Skeleton className="mt-[2px] size-4 flex-none md:size-6" />
        <Skeleton className="h-5 w-56 md:h-6" />
      </div>
    </div>
    <Skeleton className="size-4 flex-none md:size-6" />
  </div>
);

// The search page owns its own ConstrainedContainer, so the boundary must
// include it too or the shell paints full-width before snapping to 954px.
export default function Loading() {
  return (
    <ConstrainedContainer>
      <SearchResult>
        <SearchResult.Title />
        <div className="flex h-full gap-12">
          <div
            className="flex w-full flex-col items-start gap-4"
            data-test="search-loading"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <ResultRowSkeleton key={index} />
            ))}
          </div>
          <Separator orientation="vertical" className="hidden lg:block" />
          <div className="sticky top-24 hidden size-fit flex-col items-start gap-8 lg:flex">
            {Array.from({ length: 2 }).map((_, group) => (
              <div key={group} className="flex flex-col gap-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-10 w-40 rounded-md border" />
              </div>
            ))}
          </div>
        </div>
      </SearchResult>
    </ConstrainedContainer>
  );
}
