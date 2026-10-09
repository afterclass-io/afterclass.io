import { Skeleton } from "@/common/components/skeleton";

// Mirrors the first paint of ReviewItem, which is its locked form (header row
// plus the h-16 body box) until the session resolves. Heights use the same
// rem units, so the skeleton and the card stay level at every width.
export const ReviewItemSkeleton = () => {
  return (
    <div className="focus-ring flex h-fit max-w-prose flex-col items-start gap-2 rounded-md p-4 text-left md:gap-4">
      <div className="flex flex-col content-center gap-3 self-stretch overflow-hidden md:flex-row-reverse md:justify-between">
        <Skeleton className="h-6 w-[100px]" />
        <Skeleton className="h-6 w-[200px]" />
      </div>

      <Skeleton aria-hidden tabIndex={-1} className="h-16 w-full" />
    </div>
  );
};
