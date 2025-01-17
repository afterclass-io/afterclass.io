"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/common/components/Button";
import { ChevronDownIcon } from "@/common/components/CustomIcon";
import { Select } from "@/common/components/Select";
import { cn, toTitleCase } from "@/common/functions";
import { ReviewsSortBy } from "@/modules/reviews/types";

const formatSortByLabel = (sortBy: ReviewsSortBy) =>
  sortBy
    .split("_")
    .map((word) => toTitleCase(word))
    .join(" ");

export const ReviewSectionHeaderSortGroup = () => {
  const [value, setValue] = useState<ReviewsSortBy>(ReviewsSortBy.LATEST);
  const router = useRouter();
  const pathname = usePathname();

  const allSortOptions = Object.values(ReviewsSortBy);

  // Group dropdown options by their prefix
  const dropdownGroups = allSortOptions
    .filter((option) => option.includes("_"))
    .reduce(
      (groups, option) => {
        const prefix = option.split("_", 2)[0] as string;
        if (!groups[prefix]) {
          groups[prefix] = [];
        }
        groups[prefix].push(option);
        return groups;
      },
      {} as Record<string, ReviewsSortBy[]>,
    );

  const otherOptions = allSortOptions.filter((option) => !option.includes("_"));

  const handleSortChange = (newValue: ReviewsSortBy) => {
    setValue(newValue);

    const params = new URLSearchParams();
    params.set("sort", newValue);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Regular buttons */}
      {otherOptions.map((option) => (
        <Button
          key={option}
          variant="ghost"
          className={option === value ? "text-primary-default" : ""}
          rounded
          onClick={() => handleSortChange(option)}
        >
          {formatSortByLabel(option)}
        </Button>
      ))}

      {/* Create a dropdown for each group */}
      {Object.entries(dropdownGroups).map(([prefix, options]) => (
        <Select key={prefix} onValueChange={handleSortChange}>
          <Select.Trigger className="rounded-full shadow-none" asChild>
            <Button
              variant="ghost"
              rounded
              iconRight={<ChevronDownIcon />}
              className={cn(
                "text-base",
                options.includes(value) && "text-primary-default",
              )}
            >
              <Select.Value placeholder="Top" />
            </Button>
          </Select.Trigger>
          <Select.Content>
            {options.map((option) => (
              <Select.Item key={option} value={option}>
                {formatSortByLabel(option)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      ))}
    </div>
  );
};
