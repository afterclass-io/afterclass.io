import { Heading } from "@/common/components/heading";
import { Skeleton } from "@/common/components/skeleton";

// Sizes follow DetailCard in rem, with the same breakpoint steps: rows of
// 1.25rem below md and 1.5rem from md up. The two rows are the course code and
// the credit units. The divider and the block stand in for the bidding
// summary, which shows for any course that has classes.
export const DetailCardSkeleton = () => {
  return (
    <div className="bg-card flex h-full w-full flex-col gap-3 rounded-2xl p-4 text-base md:gap-5 md:p-6">
      <Heading as="h2" className="text-lg md:text-2xl">
        Details
      </Heading>
      <div className="flex flex-col gap-1 md:gap-3">
        <Skeleton className="h-5 w-full md:h-6" />
        <Skeleton className="h-5 w-full md:h-6" />
        <hr className="border-border" />
        <Skeleton className="h-16 w-full md:h-17" />
      </div>
    </div>
  );
};
