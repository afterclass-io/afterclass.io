import { Heading } from "@/common/components/heading";
import { Skeleton } from "@/common/components/skeleton";

export const DetailCardSkeleton = () => {
  return (
    <div className="bg-card flex h-full w-full flex-col gap-3 rounded-2xl p-4 text-base md:gap-5 md:p-6">
      <Heading as="h2" className="text-lg md:text-2xl">
        Details
      </Heading>
      <div className="flex flex-col gap-1 md:gap-3">
        <Skeleton className="h-[20px] w-full" />
        <Skeleton className="h-[20px] w-full" />
      </div>
    </div>
  );
};
