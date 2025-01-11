import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import { ReviewSection } from "@/modules/reviews/components/ReviewSection";

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
        <ReviewItemLoader
          variant="professor"
          slug={params.slug}
          courseCodes={courseCodes.length > 0 ? courseCodes : undefined}
        />
      </ReviewSection>
      <ReviewModalFocused variant="professor" />
    </>
  );
}
