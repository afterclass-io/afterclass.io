import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemSkeleton } from "@/modules/reviews/components/ReviewItem";
import { Skeleton } from "@/common/components/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/server/api/reviews/constants";

export default function Loading() {
  return (
    <ReviewSection>
      <ReviewSectionHeader>
        <Skeleton className="h-9 w-1/2" />
      </ReviewSectionHeader>
      <Skeleton className="h-9 w-1/3" />
      <ReviewSectionList>
        {Array.from({ length: DEFAULT_PAGE_SIZE }).map((_, index) => (
          <ReviewItemSkeleton key={index} />
        ))}
      </ReviewSectionList>
    </ReviewSection>
  );
}
