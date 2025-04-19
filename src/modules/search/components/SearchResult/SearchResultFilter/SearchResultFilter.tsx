"use client";

import { ToggleGroup } from "@/common/components/ToggleGroup";
import { toTitleCase } from "@/common/functions/toTitleCase";
import { searchResultTheme } from "../SearchResult.theme";
import { Label } from "@/common/components/label";

export type FilterOption = {
  label: string;
  value: string;
  isDefault?: boolean;
};

export type Filter = Record<string, FilterOption[]>;

export const SearchResultFilter = ({
  filters,
  onValueChange,
}: {
  filters: Filter;
  onValueChange: (key: string, value: FilterOption["value"]) => void;
}) => {
  const {
    filter: filterClasses,
    filterField,
    filterToggleGroup,
  } = searchResultTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={filterClasses()}>
      {Object.entries(filters).map(([filterFor, filterOptions], i) => (
        <div key={i} className="flex flex-col gap-4">
          <Label key={i} className={filterField()}>
            {toTitleCase(filterFor)}
          </Label>
          <ToggleGroup
            type="single"
            defaultValue={filterOptions.find((item) => item.isDefault)?.value}
            className={filterToggleGroup()}
            onValueChange={(v) => onValueChange(filterFor, v)}
          >
            {filterOptions.map((item, j) => (
              <ToggleGroup.Item
                key={j}
                value={item.value}
                aria-label={`Toggle ${item.label}`}
              >
                {item.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup>
        </div>
      ))}
    </div>
  );
};
