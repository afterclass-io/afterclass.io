"use client";
import { ChevronRightIcon, SchoolIcon } from "@/common/components/icons";
import {
  type FilterStat,
  FilterItemStats,
} from "@/common/components/FilterToggleSection/FilterToggleSectionItem";
import { Heading } from "@/common/components/heading";
import { searchResultTheme } from "../SearchResult.theme";
import { type UniversityAbbreviation } from "@prisma/client";
import { useSession } from "next-auth/react";
import { ProgressLink } from "@/common/components/progress-link";

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
  const {
    item,
    itemContent,
    itemHeadWrapper,
    itemSchoolIcon,
    itemTitle,
    itemSubtitle,
    itemStatsWrapper,
    itemArrow,
  } = searchResultTheme({ size: { initial: "sm", md: "md" } });
  const { data: session } = useSession();
  return (
    <ProgressLink href={href} className={item()} data-test="search-result">
      <div className={itemContent()}>
        <div className={itemHeadWrapper()}>
          <SchoolIcon size={24} className={itemSchoolIcon()} school={school} />
          <Heading as="h1" className={itemTitle()}>
            {title}
          </Heading>
          {subtitle && (
            <Heading as="h2" className={itemSubtitle()}>
              {subtitle}
            </Heading>
          )}
        </div>
        <div className={itemStatsWrapper()}>
          {session &&
            filterStats?.map((stat, index) => (
              <FilterItemStats key={index} {...stat} />
            ))}
        </div>
      </div>
      <ChevronRightIcon size={24} className={itemArrow()} />
    </ProgressLink>
  );
};
