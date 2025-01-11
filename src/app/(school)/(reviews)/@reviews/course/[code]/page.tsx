import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import { ReviewSection } from "@/modules/reviews/components/ReviewSection";

export default function Course({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams?: { professor?: string | string[] };
}) {
  const professorSlugs = searchParams?.professor
    ? Array.isArray(searchParams.professor)
      ? searchParams.professor
      : [searchParams.professor]
    : [];

  return (
    <>
      <ReviewSection>
        <ReviewItemLoader
          variant="course"
          code={params.code}
          slugs={professorSlugs.length > 0 ? professorSlugs : undefined}
        />
      </ReviewSection>
      <ReviewModalFocused variant="course" />
    </>
  );
}
