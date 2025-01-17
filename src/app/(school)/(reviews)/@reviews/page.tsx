import { ReviewSection } from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import { ReviewSectionHeader } from "@/modules/reviews/components/ReviewSection/ReviewSectionHeader";
import { ReviewSectionList } from "@/modules/reviews/components/ReviewSection/ReviewSectionList";
import { ReviewSectionHeaderSortGroup } from "@/modules/reviews/components/ReviewSection/ReviewSectionHeaderSortGroup";
import { ReviewSectionListFilter } from "@/modules/reviews/components/ReviewSection/ReviewSectionListFilter";

export default function Home() {
  return (
    <>
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
        <ReviewSectionList>
          <ReviewItemLoader variant="home" />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="home" />
    </>
  );
}
