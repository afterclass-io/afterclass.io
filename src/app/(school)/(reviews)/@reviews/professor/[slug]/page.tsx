import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
  ReviewSectionListFilter,
  ReviewSectionHeaderSortGroup,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";

export default async function Professor(
  props: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{
      course?: string | string[];
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  let courseCodes: string[] = [];
  if (searchParams?.course) {
    courseCodes = Array.isArray(searchParams?.course)
      ? searchParams?.course
      : [searchParams?.course];
  }

  return (
    <>
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
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
