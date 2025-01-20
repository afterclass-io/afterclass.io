import { ReviewLabelType } from "@prisma/client";

import { FilterToggleSection } from "@/common/components/FilterToggleSection";

export default function Loading() {
  return (
    <FilterToggleSection>
      <FilterToggleSection.Header type={ReviewLabelType.PROFESSOR} />
      <FilterToggleSection.Items.Skeleton />
    </FilterToggleSection>
  );
}
