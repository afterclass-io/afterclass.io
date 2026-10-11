"use client";
import { useSession } from "next-auth/react";

import { ChevronRightIcon } from "@/common/components/icons";
import {
  type FilterStat,
  FilterItemStats,
} from "@/common/components/FilterToggleSection/FilterToggleSectionItem";
import { Heading } from "@/common/components/heading";
import { ProgressLink } from "@/common/components/progress-link";
import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";

export const SearchResultItem = ({
  href,
  title,
  subtitle,
  filterStats,
}: {
  href: string;
  title: string;
  subtitle?: string;
  filterStats: FilterStat[];
}) => {
  const { data: session } = useSession();
  return (
    <ProgressLink
      href={href}
      variant="outline"
      className="bg-card flex h-fit w-full items-center justify-between gap-2 rounded-lg border p-3 whitespace-normal has-[>svg]:px-5 md:gap-4 md:p-4"
      data-test="search-result"
    >
      <div className="flex min-w-0 flex-[1_0_0%] flex-col items-start justify-center space-y-2 md:space-y-4">
        <FullWidthEnforcer className="mb-0" />
        <div className="flex items-center gap-4 self-stretch">
          <Heading
            as="h3"
            className="text-accent-foreground min-w-0 flex-1 truncate text-left tracking-tight md:text-lg"
          >
            {title}
          </Heading>
          {subtitle && (
            <p className="text-muted-foreground shrink-0 font-sans font-normal tracking-tight md:text-lg">
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-2 md:gap-4">
          {session &&
            filterStats?.map((stat, index) => (
              <FilterItemStats key={index} {...stat} />
            ))}
        </div>
      </div>
      <ChevronRightIcon
        size={24}
        className="text-muted-foreground size-4 flex-none md:size-6"
      />
    </ProgressLink>
  );
};
