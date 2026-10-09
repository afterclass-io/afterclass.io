import { Skeleton } from "@/common/components/skeleton";

// Sizes follow the rendered `/bidding/analytics?course=…&section=…` page,
// measured at 1400 px and 375 px (14 px root): the class summary card is 375 px
// and 350 px tall. The chart card below it is 1462 px and 997 px tall. Only
// the part inside the first screen can shift anything, so the chart skeleton
// stops at 48 rem rather than reproducing the full table height.
export const BidAnalyticsSkeleton = () => (
  <div className="flex w-full max-w-5xl flex-col gap-6 pt-2">
    <Skeleton className="h-[24.5rem] w-full rounded-xl md:h-[23.5rem]" />
    <Skeleton className="h-[48rem] w-full rounded-xl" />
  </div>
);
