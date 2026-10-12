import { Suspense, type ComponentProps } from "react";
import { Separator } from "@/common/components/separator";
import type { ComboboxOption } from "@/common/components/combobox";
import { BiddingClassList } from "@/modules/bidding/components/BiddingClassList";
import { CourseProfessorFilter } from "@/modules/bidding/components/CourseProfessorFilter";

/**
 * Entry state of the bidding pages: no class identified yet, so the user picks
 * a course and/or professor, then a class from the list.
 */
export function BiddingEntryView({
  initialClasses,
  selectedCourse,
  selectedProfessor,
}: {
  initialClasses: ComponentProps<typeof BiddingClassList>["initialClasses"];
  selectedCourse: ComboboxOption | null;
  selectedProfessor: ComboboxOption | null;
}) {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <Suspense>
        <CourseProfessorFilter
          selectedCourse={selectedCourse}
          selectedProfessor={selectedProfessor}
        />
      </Suspense>
      <Separator />
      <BiddingClassList initialClasses={initialClasses} />
    </div>
  );
}
