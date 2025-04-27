import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemSkeleton } from "@/modules/reviews/components/ReviewItem";
import { Skeleton } from "@/common/components/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/server/api/reviews/constants";
import { Separator } from "@/common/components/separator";

export default function Loading() {
  return (
    <ReviewSection>
      <ReviewSectionHeader>
        <Skeleton className="h-9 w-1/2" />
      </ReviewSectionHeader>
      <div className="px-4">
        <Skeleton className="h-9 w-1/3" />
      </div>
      <ReviewSectionList>
        <Separator />

        {Array.from({ length: DEFAULT_PAGE_SIZE })
          .flatMap((_, index) => [
            <ReviewItemSkeleton key={index} />,
            <Separator key={`hr-${index}`} />,
          ])
          .slice(0, -1)}
      </ReviewSectionList>
    </ReviewSection>
  );
}
