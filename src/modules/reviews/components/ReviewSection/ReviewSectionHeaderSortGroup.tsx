"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { Button } from "@/common/components/Button";
import { ChevronDownIcon } from "@/common/components/CustomIcon";
import { Select } from "@/common/components/Select";
import { cn, toTitleCase } from "@/common/functions";
import { ReviewsSortBy } from "@/modules/reviews/types";
import { useEdgeConfigs } from "@/common/hooks";

const formatSortByLabel = (sortBy: ReviewsSortBy) =>
  sortBy
    .split("_")
    .map((word) => toTitleCase(word))
    .join(" ");

export const ReviewSectionHeaderSortGroup = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // prettier-ignore
  const defaultSortBy = z.nativeEnum(ReviewsSortBy)
                          .safeParse(searchParams.get("sort"))
                            ?.data
                        ?? ReviewsSortBy.LATEST;

  const [sortBy, setSortBy] = useState<ReviewsSortBy>(defaultSortBy);

  useEffect(() => {
    if (sortBy !== defaultSortBy) {
      setSortBy(defaultSortBy);
    }
  }, [defaultSortBy]);

  const ecfg = useEdgeConfigs();

  if (!ecfg.enableReviewSort) {
    return null;
  }

  const allSortOptions = Object.values(ReviewsSortBy);

  // Group dropdown options by their prefix
  const dropdownGroups = allSortOptions
    .filter((option) => option.includes("_"))
    .reduce(
      (groups, option) => {
        const prefix = option.split("_", 2)[0]!;
        if (!groups[prefix]) {
          groups[prefix] = [];
        }
        groups[prefix].push(option);
        return groups;
      },
      {} as Record<string, ReviewsSortBy[]>,
    );

  const otherOptions = allSortOptions.filter((option) => !option.includes("_"));

  const handleSortChange = (newSortBy: ReviewsSortBy) => {
    setSortBy(newSortBy);

    const params = new URLSearchParams(searchParams);
    params.set("sort", newSortBy);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Regular buttons */}
      {otherOptions.map((option) => (
        <Button
          key={option}
          variant="ghost"
          className={cn(
            "text-base md:text-lg",
            "px-0 py-0 md:px-2",
            option === sortBy ? "text-primary-default" : "",
          )}
          onClick={() => handleSortChange(option)}
        >
          {formatSortByLabel(option)}
        </Button>
      ))}

      {/* Create a dropdown for each group */}
      {Object.entries(dropdownGroups).map(([prefix, options]) => (
        <Select
          // force re-render when value changes
          // see https://github.com/radix-ui/primitives/issues/1569
          key={prefix + sortBy}
          value={options.includes(sortBy) ? sortBy : undefined}
          onValueChange={handleSortChange}
        >
          <Select.Trigger asChild>
            <Button
              variant="ghost"
              iconRight={<ChevronDownIcon />}
              className={cn(
                "text-base md:text-lg",
                "px-0 py-0 md:px-2",
                options.includes(sortBy) && "text-primary-default",
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
