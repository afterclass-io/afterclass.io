import { Skeleton } from "@/common/components/skeleton";

// Mirrors the locked ReviewItem that a signed-out visitor sees: the header row
// plus the h-16 body box. The same rem units keep both level at every width.
// A signed-in card is taller (body and footer follow). Measured with the seed
// data: cards 212 to 280 px at 1024 px wide and 240 to 296 px at 412 px, against
// a skeleton of 136 px and 144 px. The page grows when signed-in cards replace
// the skeletons.
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
