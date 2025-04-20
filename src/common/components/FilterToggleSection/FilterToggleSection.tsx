import type { ComponentPropsWithoutRef } from "react";
import {
  type FilterToggleSectionVariants,
  filterToggleSectionTheme,
} from "./FilterToggleSection.theme";
import { LockedOverlay } from "@/common/components/locked-overlay";
import { FilterToggleSectionHeader } from "./FilterToggleSectionHeader";
import { FilterToggleSectionItems } from "./FilterToggleSectionItems";
import { FilterToggleSectionItem } from "./FilterToggleSectionItem";

export type FilterToggleSectionProps = ComponentPropsWithoutRef<"div"> &
  FilterToggleSectionVariants & {
    isLocked?: boolean;
  };

export const FilterToggleSection = ({
  isLocked,
  ...props
}: FilterToggleSectionProps) => {
  const { section } = filterToggleSectionTheme({
    size: { initial: "sm", md: "md" },
  });
  if (isLocked) {
    return (
      <div className={section()} {...props} data-test="filter-toggle-section">
        <LockedOverlay />
        <div className="h-[150px] w-full"></div>
      </div>
    );
  }

  return (
    <div className={section()} {...props} data-test="filter-toggle-section">
      {props.children}
    </div>
  );
};

FilterToggleSection.Header = FilterToggleSectionHeader;
FilterToggleSection.Items = FilterToggleSectionItems;
FilterToggleSection.Item = FilterToggleSectionItem;
