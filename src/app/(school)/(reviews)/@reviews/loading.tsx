import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemSkeleton } from "@/modules/reviews/components/ReviewItem";
import { Skeleton } from "@/common/components/skeleton";

export default function Loading() {
  return (
    <ReviewSection>
      <ReviewSectionHeader>
        <Skeleton className="h-9 w-1/2" />
      </ReviewSectionHeader>
      <Skeleton className="h-9 w-1/3" />
      <ReviewSectionList>
        <ReviewItemSkeleton />
        <ReviewItemSkeleton />
        <ReviewItemSkeleton />
        <ReviewItemSkeleton />
        <ReviewItemSkeleton />
        <ReviewItemSkeleton />
      </ReviewSectionList>
    </ReviewSection>
  );
}
