import type { ComponentPropsWithoutRef } from "react";
import { LockedOverlay } from "@/common/components/locked-overlay";
import { FilterToggleSectionHeader } from "./FilterToggleSectionHeader";
import { FilterToggleSectionItems } from "./FilterToggleSectionItems";
import { FilterToggleSectionItem } from "./FilterToggleSectionItem";

export type FilterToggleSectionProps = ComponentPropsWithoutRef<"div"> & {
  isLocked?: boolean;
};

export const FilterToggleSection = ({
  isLocked,
  ...props
}: FilterToggleSectionProps) => {
  return (
    <div
      className="bg-card relative flex w-full flex-col items-start gap-3 rounded-2xl px-3 py-4 select-none md:gap-5 md:p-6"
      {...props}
      data-slot="filter-toggle-section"
      data-test="filter-toggle-section"
    >
      {isLocked ? (
        <>
          <LockedOverlay />
          <div className="h-[150px] w-full"></div>
        </>
      ) : (
        props.children
      )}
    </div>
  );
};

FilterToggleSection.Header = FilterToggleSectionHeader;
FilterToggleSection.Items = FilterToggleSectionItems;
FilterToggleSection.Item = FilterToggleSectionItem;
