"use client";

import { ToggleGroup, ToggleGroupItem } from "@/common/components/toggle-group";
import { Label } from "@/common/components/label";
import { toTitleCase } from "@/common/functions";

export type FilterOption = {
  label: string;
  value: string;
  isDefault?: boolean;
};

export type Filter = Record<string, FilterOption[]>;

export const SearchResultFilter = ({
  filters,
  onValueChange,
  values,
}: {
  filters: Filter;
  onValueChange: (key: string, value: FilterOption["value"]) => void;
  values?: Record<string, string>;
}) => {
  return (
    <div className="flex w-full flex-wrap items-start gap-4">
      {Object.entries(filters).map(([filterFor, filterOptions], i) => (
        <div key={i} className="flex flex-col gap-4">
          <Label key={i} className="w-fit">
            {toTitleCase(filterFor)}
          </Label>
          <ToggleGroup
            type="single"
            aria-label={`${toTitleCase(filterFor)} filter`}
            className="border"
            defaultValue={filterOptions.find((item) => item.isDefault)?.value}
            value={values?.[filterFor]}
            onValueChange={(v) => {
              if (v) onValueChange(filterFor, v);
            }}
          >
            {filterOptions.map((item, j) => (
              <ToggleGroupItem
                key={j}
                value={item.value}
                aria-label={`Toggle ${item.label}`}
                className="bg-card text-foreground focus-ring hover:bg-accent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground inline-flex h-10 flex-shrink-0 items-center justify-center px-5 py-1 text-base transition-colors"
              >
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ))}
    </div>
  );
};
