import { Separator } from "@/common/components/separator";
import { Skeleton } from "@/common/components/skeleton";

// Sizes follow the rendered `/search?q=…` page, measured at 1400 px and 375 px
// (14 px root). Title: 44 px and 35 px. Result row at first paint: 78 px and
// 48 px. A signed-in viewer sees the same row height at first paint, because
// the stats line appears only after the client session resolves. The filter
// panel is `lg` only and 280 px by 176 px.
const ROW_COUNT = 5;

export const SearchResultSkeleton = () => (
  <div className="flex h-full w-full flex-col gap-10">
    <Skeleton className="h-10 w-2/3 md:h-11" />
    <div className="flex h-full gap-12">
      <div className="flex w-full flex-col items-start gap-4">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <Skeleton
            key={index}
            className="h-14 w-full rounded-lg md:h-[4.875rem]"
          />
        ))}
      </div>
      <Separator orientation="vertical" className="hidden lg:block" />
      <Skeleton className="hidden h-44 w-[17.5rem] shrink-0 lg:block" />
    </div>
  </div>
);
