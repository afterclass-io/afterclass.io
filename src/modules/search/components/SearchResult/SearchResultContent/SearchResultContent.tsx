"use client";
import { z } from "zod";
import { useState } from "react";
import { type SearchCourseResult } from "@/modules/search/functions/searchCourse";
import { type SearchProfResult } from "@/modules/search/functions/searchProf";
import {
  BooksIcon,
  GraduationCapIcon,
  PencilIcon,
} from "@/common/components/icons";
import { SearchResultList } from "../SearchResultList";
import { SearchResultItem } from "../SearchResultItem";
import { SearchResultFilter } from "../SearchResultFilter";
import { SearchResultEmpty } from "../SearchResultEmpty";
import { type UniversityAbbreviation } from "@prisma/client";
import { Separator } from "@/common/components/separator";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const filterOptions = z.object({
  school: z.enum(["all", "SMU", "NUS", "NTU"]),
  type: z.enum(["all", "professor", "course"]),
});
type FilterOptions = z.infer<typeof filterOptions>;

export const SearchResultContent = ({
  searchedCourse,
  searchedProf,
}: {
  searchedCourse: SearchCourseResult[];
  searchedProf: SearchProfResult[];
}) => {
  const [filter, setFilter] = useState<FilterOptions>({
    school: "all",
    type: "all",
  });

  const isSchoolSelected = (uniAbbrv: UniversityAbbreviation) => {
    switch (filter.school) {
      case "all":
        return true;
      default:
        return uniAbbrv === filter.school;
    }
  };

  const isEmpty = () => {
    switch (filter.type) {
      case "all":
        return schoolFilteredCourse.length + schoolFilteredProf.length === 0;
      case "course":
        return schoolFilteredCourse.length === 0;
      case "professor":
        return schoolFilteredProf.length === 0;
    }
  };

  const schoolFilteredCourse = searchedCourse.filter((c) =>
    isSchoolSelected(c.uniAbbrv),
  );
  const schoolFilteredProf = searchedProf.filter((p) =>
    isSchoolSelected(p.uniAbbrv),
  );

  return (
    <div className="flex h-full gap-12">
      <SearchResultList>
        <SearchResultEmpty show={isEmpty()} />
        {(filter.type === "all" || filter.type === "course") &&
          schoolFilteredCourse.map((c) => (
            <SearchResultItem
              key={c.courseCode}
              school={c.uniAbbrv}
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
          schoolFilteredProf.map((p) => (
            <SearchResultItem
              key={p.profSlug}
              school={p.uniAbbrv}
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
          school: [
            { label: "All", value: "all", isDefault: true },
            { label: "SMU", value: "SMU" },
            { label: "NUS", value: "NUS" },
            { label: "NTU", value: "NTU" },
          ],
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
