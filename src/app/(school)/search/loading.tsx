import { SearchIcon } from "@/common/components/icons";
import { ConstrainedContainer } from "@/common/components/constrained-container";
import { PageTitle } from "@/common/components/page-title";
import { Separator } from "@/common/components/separator";
import { Skeleton } from "@/common/components/skeleton";

// Route-level streaming shell for /search (#523). Mirrors SearchResult:
// PageTitle + results list + filter sidebar. Heights are the #519 measured
// scale — no arbitrary values.
export default function Loading() {
  return (
    <ConstrainedContainer>
      <div className="flex h-full w-full flex-col gap-10">
        <PageTitle
          contentLeft={
            <SearchIcon className="text-muted-foreground size-8 flex-none" />
          }
        >
          {/* PageTitle heading is text-lg (28px = h-7) / md:text-3xl (36px = h-9). */}
          <Skeleton className="h-7 w-[240px] md:h-9" />
        </PageTitle>
        <div className="flex h-full gap-12">
          <div className="flex w-full flex-col items-start gap-4">
            {/* SearchResultItem rows: title (md:text-lg = h-7), stats
                (text-sm = h-5), chevron (size-6). */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card flex h-fit w-full items-center justify-between gap-2 rounded-lg border p-3 md:p-4"
              >
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-40 md:h-7" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <Skeleton className="size-6" />
              </div>
            ))}
          </div>
          <Separator orientation="vertical" className="hidden lg:block" />
          {/* Filter sidebar: Label (text-sm = h-5) + ToggleGroupItem pills (h-10). */}
          <div className="sticky top-24 hidden size-fit flex-col items-start gap-8 lg:flex">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-5 w-16" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConstrainedContainer>
  );
}
