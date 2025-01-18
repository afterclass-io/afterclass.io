import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemSkeleton } from "@/modules/reviews/components/ReviewItem";

export default function Loading() {
  return (
    <ReviewSection>
      <ReviewSectionHeader />
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
