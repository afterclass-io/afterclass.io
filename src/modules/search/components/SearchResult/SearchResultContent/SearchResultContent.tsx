"use client";
import { z } from "zod";
import { useState } from "react";
import {
  type SearchCourseResult,
  type SearchProfResult,
} from "@/modules/search/types";
import {
  BooksIcon,
  GraduationCapIcon,
  PencilIcon,
} from "@/common/components/icons";
import { SearchResultList } from "../SearchResultList";
import { SearchResultItem } from "../SearchResultItem";
import { SearchResultFilter } from "../SearchResultFilter";
import { SearchResultEmpty } from "../SearchResultEmpty";
import { Separator } from "@/common/components/separator";
import { MIN_QUERY_LEN } from "@/common/constants/search";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the schema is used only for its inferred type
const filterOptions = z.object({
  type: z.enum(["all", "professor", "course"]),
});
type FilterOptions = z.infer<typeof filterOptions>;

export const SearchResultContent = ({
  query,
  searchedCourse,
  searchedProf,
}: {
  query: string;
  searchedCourse: SearchCourseResult[];
  searchedProf: SearchProfResult[];
}) => {
  const [filter, setFilter] = useState<FilterOptions>({
    type: "all",
  });

  const isEmpty = () => {
    switch (filter.type) {
      case "all":
        return searchedCourse.length + searchedProf.length === 0;
      case "course":
        return searchedCourse.length === 0;
      case "professor":
        return searchedProf.length === 0;
    }
  };

  return (
    <div className="flex h-full gap-12">
      <SearchResultList>
        <SearchResultEmpty
          show={isEmpty()}
          reason={query.trim().length < MIN_QUERY_LEN ? "short" : "none"}
          query={query}
        />
        {(filter.type === "all" || filter.type === "course") &&
          searchedCourse.map((c) => (
            <SearchResultItem
              key={c.courseCode}
              href={`/course/${c.courseCode}`}
              title={c.courseName}
              subtitle={c.courseCode}
              filterStats={[
                { icon: <PencilIcon />, stat: c.reviewCount },
                { icon: <GraduationCapIcon />, stat: c.profCount },
              ]}
            />
          ))}
        {(filter.type === "all" || filter.type === "professor") &&
          searchedProf.map((p) => (
            <SearchResultItem
              key={p.profSlug}
              href={`/professor/${p.profSlug}`}
              title={p.profName}
              filterStats={[
                { icon: <PencilIcon />, stat: p.reviewCount },
                { icon: <BooksIcon />, stat: p.courseCount },
              ]}
            />
          ))}
      </SearchResultList>
      <Separator orientation="vertical" className="hidden lg:block" />
      <SearchResultFilter
        onValueChange={(key, value) => {
          setFilter((prev) => ({ ...prev, [key]: value }));
        }}
        filters={{
          type: [
            { label: "All", value: "all", isDefault: true },
            { label: "Professor", value: "professor" },
            { label: "Course", value: "course" },
          ],
        }}
      />
    </div>
  );
};
