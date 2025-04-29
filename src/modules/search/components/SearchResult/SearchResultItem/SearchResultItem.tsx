"use client";
import { useSession } from "next-auth/react";
import { type UniversityAbbreviation } from "@prisma/client";

import { ChevronRightIcon, SchoolIcon } from "@/common/components/icons";
import {
  type FilterStat,
  FilterItemStats,
} from "@/common/components/FilterToggleSection/FilterToggleSectionItem";
import { Heading } from "@/common/components/heading";
import { ProgressLink } from "@/common/components/progress-link";
import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";

export const SearchResultItem = ({
  href,
  school,
  title,
  subtitle,
  filterStats,
}: {
  href: string;
  school: UniversityAbbreviation;
  title: string;
  subtitle?: string;
  filterStats: FilterStat[];
}) => {
  const { data: session } = useSession();
  return (
    <>
      <FullWidthEnforcer />
      <ProgressLink
        href={href}
        variant="outline"
        className="bg-card flex h-fit w-full items-center justify-between gap-2 rounded-lg border p-3 whitespace-normal md:gap-4 md:p-4"
        data-test="search-result"
      >
        <div className="flex flex-[1_0_0%] flex-col items-start justify-center gap-2 md:gap-4">
          <div className="flex items-center gap-4 self-stretch">
            <SchoolIcon
              className="mt-[2px] size-4 flex-none md:size-6"
              school={school}
            />
            <Heading
              as="h1"
              className="text-accent-foreground text-left tracking-tight md:text-lg"
            >
              {title}
            </Heading>
            {subtitle && (
              <Heading
                as="h2"
                className="text-muted-foreground font-normal tracking-tight md:text-lg"
              >
                {subtitle}
              </Heading>
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
    </>
  );
};
