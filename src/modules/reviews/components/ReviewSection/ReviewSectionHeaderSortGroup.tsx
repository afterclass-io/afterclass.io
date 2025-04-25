"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { Button } from "@/common/components/button";
import { ChevronDownIcon } from "@/common/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import { cn, toTitleCase } from "@/common/functions";
import { ReviewsSortBy } from "@/modules/reviews/types";
import { useEdgeConfigs } from "@/common/hooks";
import { Tag } from "@/common/components/tag";

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
                          .safeParse(searchParams?.get("sort"))
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
        groups[prefix] ??= [];
        groups[prefix].push(option);
        return groups;
      },
      {} as Record<string, ReviewsSortBy[]>,
    );

  const otherOptions = allSortOptions.filter((option) => !option.includes("_"));

  const handleSortChange = (newSortBy: ReviewsSortBy) => {
    setSortBy(newSortBy);

    const params = new URLSearchParams(searchParams ?? undefined);
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
            "px-0 py-0 md:px-2",
            option === sortBy ? "text-primary" : "text-muted-foreground",
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
          <SelectTrigger asChild className="">
            <Button
              variant="ghost"
              className={cn(
                "border-none px-0 py-0 md:px-2 dark:bg-transparent",
                options.includes(sortBy) && "text-primary",
              )}
            >
              <SelectValue placeholder="Top" />
              <ChevronDownIcon />
            </Button>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {formatSortByLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
};
