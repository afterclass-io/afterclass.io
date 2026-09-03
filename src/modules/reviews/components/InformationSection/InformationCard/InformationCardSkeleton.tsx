import { Heading } from "@/common/components/heading";
import { ClipboardIcon } from "@/common/components/icons";
import { Skeleton } from "@/common/components/skeleton";

export const InformationCardSkeleton = () => {
  return (
    <div className="bg-card flex h-full w-full flex-col gap-3 rounded-2xl p-4 text-base md:gap-5 md:p-6">
      <div className="flex items-center gap-2 pl-1 text-lg md:gap-4 md:pl-0 md:text-2xl">
        <ClipboardIcon className="size-4 md:size-6" />
        <Heading as="h2">Information</Heading>
      </div>
      <div className="flex flex-col gap-2">
        {/* Rendered description is line-clamp-6 leading-5 → 6 × 20px = 120px. */}
        <div
          className="text-muted-foreground line-clamp-5 leading-5 md:line-clamp-3"
          data-test="course-description"
        >
          <Skeleton className="h-[120px] w-full" />
        </div>
        {/* Rendered children (LoginButton / Modal trigger) are Button h-9 = 36px. */}
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
};
