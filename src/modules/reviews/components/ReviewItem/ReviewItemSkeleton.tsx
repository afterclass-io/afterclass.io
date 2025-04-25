import { Skeleton } from "@/common/components/skeleton";

export const ReviewItemSkeleton = () => {
  return (
    <div className="focus-ring hover:bg-surface-elevated flex h-fit max-w-prose cursor-pointer flex-col items-start gap-2 rounded-md text-left md:gap-4">
      <div className="flex flex-col content-center gap-3 self-stretch md:flex-row-reverse md:justify-between">
        <Skeleton className="h-[24px] w-[100px]" />
        <Skeleton className="h-[24px] w-[200px]" />
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-accent-foreground line-clamp-5 wrap-anywhere md:line-clamp-3 md:text-sm">
          <Skeleton aria-hidden tabIndex={-1}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum
          </Skeleton>
        </div>
      </div>
    </div>
  );
};
