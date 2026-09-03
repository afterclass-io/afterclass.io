import { Heading } from "@/common/components/heading";
import { Skeleton } from "@/common/components/skeleton";

export const DetailCardSkeleton = () => {
  return (
    <div className="bg-card flex h-full w-full flex-col gap-3 rounded-2xl p-4 text-base md:gap-5 md:p-6">
      <Heading as="h2" className="text-lg md:text-2xl">
        Details
      </Heading>
      {/* Mirrors the rendered DetailCard: md:text-lg rows (28px = h-7, 24px
          = h-6 on mobile) + course-outline row + divider + bidding block
          (text-sm 20px label/link, text-xs 16px count). Measured against the
          rendered card with outline + bidding (#519). */}
      <div className="flex flex-col gap-1 md:gap-3">
        <Skeleton className="h-6 w-full md:h-7" />
        <Skeleton className="h-6 w-full md:h-7" />
        <Skeleton className="h-6 w-40 md:h-7" />
        <hr className="border-border" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
    </div>
  );
};
