import type { ReactNode, ComponentPropsWithoutRef } from "react";
import {
  type FilterToggleSectionVariants,
  filterToggleSectionTheme,
} from "../FilterToggleSection.theme";
import { Checkbox, type CheckedState } from "@/common/components/checkbox";

export type FilterStat = {
  icon: ReactNode;
  stat: number;
};

export type FilterItem = {
  value: string; // form value
  label: string; // label shown to user
  sublabel?: string; // additional label shown to user
  filterStats: FilterStat[];
};

export type FilterToggleSectionItemProps = ComponentPropsWithoutRef<"div"> &
  FilterToggleSectionVariants &
  FilterItem;

export const FilterItemStats = ({ icon, stat }: FilterStat) => {
  const { stat: statWrapper } = filterToggleSectionTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={statWrapper()}>
      {icon}
      <p data-test="filter-item-value">{stat}</p>
    </div>
  );
};

export const FilterToggleSectionItem = ({
  label,
  sublabel,
  filterStats,
  selected,
  ...props
}: FilterToggleSectionItemProps) => {
  const { item, content, itemHeader, contentSubheaderWrapper, statWrapper } =
    filterToggleSectionTheme({ selected, size: { initial: "sm", md: "md" } });
  return (
    <div className={item()} {...props}>
      <Checkbox checked={selected as CheckedState} />
      <div className={content()}>
        <p className={itemHeader()}>{label}</p>
        <div className={contentSubheaderWrapper()}>
          {sublabel && (
            <p
              className={itemHeader({ class: "text-muted-foreground" })}
              data-test="filter-item-label"
            >
              {sublabel}
            </p>
          )}
          <div className={statWrapper()}>
            {filterStats?.map((stat, index) => (
              <FilterItemStats key={index} {...stat} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
