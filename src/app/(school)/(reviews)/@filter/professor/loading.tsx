import { ReviewType } from "@/generated/prisma/enums";
import { FilterToggleSection } from "@/common/components/FilterToggleSection";

export default function Loading() {
  return (
    <FilterToggleSection>
      <FilterToggleSection.Header type={ReviewType.COURSE} />
      <FilterToggleSection.Items.Skeleton />
    </FilterToggleSection>
  );
}
