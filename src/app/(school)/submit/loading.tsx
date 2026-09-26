import { ConstrainedContainer } from "@/common/components/constrained-container";
import { PageTitle } from "@/common/components/page-title";
import { Separator } from "@/common/components/separator";
import { Skeleton } from "@/common/components/skeleton";
import { SchoolTag } from "@/common/components/tag-school";
import { type UniversityAbbreviation } from "@/generated/prisma/enums";

const school = "SMU" satisfies UniversityAbbreviation;

// Mirrors ReviewFormSection's `bg-card flex w-full flex-col ... md:w-160`
// panel: a combobox header row, then rating / labels / body / tips fields.
// Real text is kept in PageTitle so the heading does not swap glyphs.
const ReviewFormSectionSkeleton = ({ showSkip }: { showSkip: boolean }) => (
  <div className="bg-card flex w-full flex-col items-start gap-6 rounded-2xl px-4 py-6 sm:px-6 sm:py-8 md:w-160">
    <div className="flex flex-col items-start justify-between gap-6 self-stretch sm:flex-row">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="min-h-12 w-full min-w-64 rounded-lg border md:w-80" />
      </div>
      {showSkip && <Skeleton className="h-9 w-28 rounded-md" />}
    </div>
    <Separator />
    <div className="flex flex-col items-start gap-8 self-stretch">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full max-w-96 rounded-md border" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  </div>
);

export default function Loading() {
  return (
    <ConstrainedContainer className="flex flex-col space-y-5 md:space-y-8">
      <PageTitle contentRight={<SchoolTag school={school} />}>
        Write a Review
      </PageTitle>
      <div className="flex flex-col items-start gap-5 md:gap-14">
        <ReviewFormSectionSkeleton showSkip={false} />
        <ReviewFormSectionSkeleton showSkip />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
    </ConstrainedContainer>
  );
}
