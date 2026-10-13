import { Heading } from "@/common/components/heading";
import { ClipboardIcon } from "@/common/components/icons";
import { Skeleton } from "@/common/components/skeleton";

import { SkeletonCard } from "../SkeletonCard";

// Sizes follow InformationCard in rem, so they scale with the root font size
// like the real content does. The description reserves the full six-line clamp
// (6 x leading-5), which most course descriptions reach. The button row stands
// in for the login or "see more" button (h-9) that always follows it.
export const InformationCardSkeleton = () => {
  return (
    <SkeletonCard>
      <div className="flex items-center gap-2 pl-1 text-lg md:gap-4 md:pl-0 md:text-2xl">
        <ClipboardIcon className="size-4 md:size-6" />
        <Heading as="h2">Information</Heading>
      </div>
      <div className="flex flex-col gap-2">
        <div
          className="text-muted-foreground line-clamp-6 leading-5"
          data-test="course-description"
        >
          <Skeleton className="h-30 w-full" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </SkeletonCard>
  );
};
