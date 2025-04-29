import { Skeleton } from "@/common/components/skeleton";

export const FilterToggleSectionItemSkeleton = () => {
  return (
    <div className="group flex cursor-pointer items-center gap-2 self-stretch rounded-lg py-2 pr-2 pl-1 md:w-64 md:gap-4 md:border md:p-3">
      <div className="flex flex-[1_0_0] items-center justify-between gap-2 md:flex-auto md:flex-col md:items-start md:justify-center">
        <div className="text-accent-foreground line-clamp-1 flex-[1_0_0] leading-4 font-medium text-ellipsis md:line-clamp-none md:flex-auto md:text-sm md:font-semibold">
          <Skeleton className="h-[24px] w-[229px]" />
        </div>
        <div className="flex items-center justify-between self-stretch sm:gap-2">
          <Skeleton className="h-6 w-12" />
          <div className="text-accent-foreground line-clamp-1 flex-[1_0_0] leading-4 font-medium text-ellipsis md:line-clamp-none md:flex-auto md:text-sm md:font-semibold">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const FilterToggleSectionItemsSkeleton = () => {
  return (
    <div className="flex flex-col items-start gap-0 self-stretch md:flex-row md:flex-wrap md:content-start md:gap-4">
      <FilterToggleSectionItemSkeleton />
      <FilterToggleSectionItemSkeleton />
      <FilterToggleSectionItemSkeleton />
    </div>
  );
};
