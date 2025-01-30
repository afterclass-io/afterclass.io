"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReviewType } from "@prisma/client";

import { FilterToggleSection as Filter } from "@/common/components/FilterToggleSection";
import { type FilterItem } from "@/common/components/FilterToggleSection/FilterToggleSectionItem";
import { Button } from "@/common/components/Button";
import { cn } from "@/common/functions";

export type FilterToggleSectionProps =
  | {
      dataToFilter: FilterItem[];
      filterType: ReviewType;
      searchParamsName: string;
      onSelectChange?: (selectedValue: string) => void;
      isLocked?: false;
    }
  | {
      isLocked: true;
      filterType: ReviewType;
      searchParamsName?: string;
    };

export const FilterToggleSection = (props: FilterToggleSectionProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams);
  const selected = params.getAll(props.searchParamsName ?? "");
  const [selectedItems, setSelectedItems] =
    useState<FilterItem["value"][]>(selected);
  const [isFilterItemsExpanded, setIsFilterItemsExpanded] = useState(false);

  if (props.isLocked)
    return (
      <Filter isLocked={props.isLocked}>
        <Filter.Header type={props.filterType} />
      </Filter>
    );

  const { dataToFilter, filterType, searchParamsName, onSelectChange } = props;

  if (dataToFilter.length === 0) {
    return (
      <Filter>
        <Filter.Header type={filterType} />
        <p className="w-full py-6 text-center">No Results</p>
      </Filter>
    );
  }

  const getNewSelectedItems = (selectedValue: string) =>
    selectedItems.includes(selectedValue)
      ? selectedItems.filter((v) => v !== selectedValue)
      : [...selectedItems, selectedValue];

  const updateSearchParams = (newSelectedItems: string[]) => {
    params.delete(searchParamsName);
    newSelectedItems.forEach((v) => params.append(searchParamsName, v));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  dataToFilter.sort((a, b) => {
    const aStat = a.filterStats[0]?.stat ?? 0;
    const bStat = b.filterStats[0]?.stat ?? 0;
    return bStat - aStat;
  });

  return (
    <Filter>
      <Filter.Header type={filterType} />
      <Filter.Items
        className={cn(
          // tailwind classes should not be computed dynamically
          // see https://tailwindcss.com/docs/content-configuration#dynamic-class-names
          isFilterItemsExpanded
            ? "[&>*:nth-child(n+4)]:flex"
            : "[&>*:nth-child(n+4)]:hidden",
          "md:[&>*:nth-child(n+4)]:flex",
        )}
      >
        {dataToFilter.map((item, index) => (
          <Filter.Item
            key={index}
            {...item}
            onClick={() => {
              const newSelectedItems = getNewSelectedItems(item.value);
              setSelectedItems(newSelectedItems);
              onSelectChange?.(item.value);
              updateSearchParams(newSelectedItems);
            }}
            selected={selectedItems.includes(item.value)}
            data-test="filter-item"
          />
        ))}
      </Filter.Items>
      {dataToFilter.length > 3 && (
        <Button
          variant="link"
          className="px-1 md:hidden"
          onClick={() => setIsFilterItemsExpanded(!isFilterItemsExpanded)}
          isResponsive
        >
          {isFilterItemsExpanded ? "Show less" : "Show more"}
        </Button>
      )}
    </Filter>
  );
};
