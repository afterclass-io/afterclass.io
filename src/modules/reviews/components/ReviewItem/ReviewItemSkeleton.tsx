import { reviewItemTheme } from "./ReviewItem.theme";
import { Skeleton } from "@/common/components/skeleton";

export const ReviewItemSkeleton = () => {
  const { wrapper, body, headingContainer } = reviewItemTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div
      className={wrapper({
        className: "cursor-default items-stretch hover:bg-inherit",
      })}
    >
      <div className={headingContainer()}>
        <Skeleton className="h-[24px] w-[100px]" />
        <Skeleton className="h-[24px] w-[200px]" />
      </div>

      <div className="flex flex-col gap-1">
        <div className={body()}>
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
