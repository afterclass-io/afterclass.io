import { Separator } from "@/common/components/separator";
import { ConstrainedContainer } from "@/common/components/constrained-container";
import { PageTitle } from "@/common/components/page-title";
import { Skeleton } from "@/common/components/skeleton";

// Route-level streaming shell for /submit (#523). Mirrors the rendered page:
// PageTitle + two ReviewFormSection cards. Heights are the #519 measured
// scale — no arbitrary values.
export default function Loading() {
  return (
    <ConstrainedContainer className="flex flex-col space-y-5 md:space-y-8">
      <PageTitle>
        {/* PageTitle heading is text-lg (28px = h-7) / md:text-3xl (36px = h-9). */}
        <Skeleton className="h-7 w-[200px] md:h-9" />
      </PageTitle>
      <div className="flex flex-col gap-5 md:gap-14">
        {/* ReviewFormSection cards (bg-card rounded-2xl px-4 py-6 md:w-160):
            Combobox trigger (min-h-12) + rating hearts (iconSize 24 = h-6)
            + label pills (h-8) + Textareas (min-h-16). */}
        {[0, 1].map((section) => (
          <div
            key={section}
            className="bg-card flex w-full flex-col items-start gap-6 rounded-2xl px-4 py-6 sm:px-6 sm:py-8 md:w-160"
          >
            <Skeleton className="min-h-12 w-full max-w-80 rounded-lg" />
            <Separator />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-16" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-14" />
              </div>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="min-h-16 w-full" />
            </div>
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="min-h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    </ConstrainedContainer>
  );
}
