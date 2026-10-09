import { Skeleton } from "@/common/components/skeleton";

// The schedule card renders 476 px tall in the right rail at 1400 px, and the
// rail is `lg:flex` only, so one size covers every width that shows it.
export const BidWindowScheduleCardSkeleton = () => (
  <Skeleton className="h-[29.75rem] w-full rounded-xl" />
);
