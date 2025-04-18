import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
  ReviewSectionListFilter,
  ReviewSectionHeaderSortGroup,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";

export default async function Course(
  props: {
    params: Promise<{ code: string }>;
    searchParams?: Promise<{ professor?: string | string[] }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  // assuming all course codes are uppercase
  const courseCode = params.code.toUpperCase();
  const professorSlugs = searchParams?.professor
    ? Array.isArray(searchParams?.professor)
      ? searchParams?.professor
      : [searchParams?.professor]
    : [];

  return (
    <>
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
        <ReviewSectionList>
          <ReviewItemLoader
            variant="course"
            code={courseCode}
            slugs={professorSlugs.length > 0 ? professorSlugs : undefined}
          />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="course" />
    </>
  );
}
