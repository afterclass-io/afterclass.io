import { ReviewSection } from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import { ReviewSectionHeader } from "@/modules/reviews/components/ReviewSection/ReviewSectionHeader";
import { ReviewSectionList } from "@/modules/reviews/components/ReviewSection/ReviewSectionList";
import { ReviewSectionHeaderSortGroup } from "@/modules/reviews/components/ReviewSection/ReviewSectionHeaderSortGroup";

export default function Professor({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: {
    course?: string | string[];
  };
}) {
  let courseCodes: string[] = [];
  if (searchParams?.course) {
    courseCodes = Array.isArray(searchParams.course)
      ? searchParams.course
      : [searchParams.course];
  }

  return (
    <>
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionList>
          <ReviewItemLoader
            variant="professor"
            slug={params.slug}
            courseCodes={courseCodes.length > 0 ? courseCodes : undefined}
          />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="professor" />
    </>
  );
}
