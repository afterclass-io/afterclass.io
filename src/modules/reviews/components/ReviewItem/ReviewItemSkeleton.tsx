import { Skeleton } from "@/common/components/skeleton";

export const ReviewItemSkeleton = () => {
  return (
    <div className="focus-ring flex h-fit max-w-prose flex-col items-start gap-2 rounded-md p-4 text-left md:gap-4">
      <div className="flex content-center justify-between gap-3 self-stretch md:flex-row-reverse">
        <Skeleton className="h-[24px] w-[100px]" />
        <Skeleton className="h-[24px] w-[200px]" />
      </div>

      {/* Body mirrors ReviewBody: rating row (5 × 16px hearts + gaps = w-24
          h-4) + label row (24px) + 3-line clamped text — measured against the
          rendered authenticated ReviewItem (#519). */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-x-4">
          <Skeleton className="h-[24px] w-[64px]" />
          <Skeleton className="h-[24px] w-[96px]" />
        </div>
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

      {/* Footer mirrors ReviewFooter vote row (~36px); the reactions group
          (~44px more) only renders for reaction-enabled feeds, so it is the
          residual delta for those users. */}
      <div className="flex gap-4">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  );
};
