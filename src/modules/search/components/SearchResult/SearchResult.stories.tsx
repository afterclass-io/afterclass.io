import type { Meta, StoryObj } from "@storybook/react";

import { SearchResult } from "./SearchResult";
import { type SearchCourseResult } from "@/modules/search/functions/searchCourse";
import { type SearchProfResult } from "@/modules/search/functions/searchProf";
import {
  BooksIcon,
  GraduationCapIcon,
  PencilIcon,
} from "@/common/components/icons";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/SearchResult",
  component: SearchResult,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    children: "SearchResult",
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof SearchResult>;

export default meta;
type Story = StoryObj<typeof meta>;

const searchedCourse = [
  {
    uniAbbrv: "SMU",
    courseCode: "IS215",
    courseName: "Course 1",
    profCount: 21,
    reviewCount: 22,
  },
  {
    uniAbbrv: "SMU",
    courseCode: "IS216",
    courseName: "Course 1a",
    profCount: 23,
    reviewCount: 24,
  },
  {
    uniAbbrv: "NUS",
    courseCode: "CS1010",
    courseName: "Course 2",
    profCount: 25,
    reviewCount: 26,
  },
  {
    uniAbbrv: "NTU",
    courseCode: "CS101",
    courseName: "Course 3",
    profCount: 27,
    reviewCount: 288,
  },
] satisfies SearchCourseResult[];

const searchedProf = [
  {
    uniAbbrv: "SMU",
    profName: "Prof 1",
    profSlug: "prof-1",
    courseCount: 11,
    reviewCount: 12,
  },
  {
    uniAbbrv: "SMU",
    profName: "Prof 1a",
    profSlug: "prof-1a",
    courseCount: 13,
    reviewCount: 14,
  },
  {
    uniAbbrv: "NUS",
    profName: "Prof 2",
    profSlug: "prof-2",
    courseCount: 15,
    reviewCount: 16,
  },
  {
    uniAbbrv: "NTU",
    profName: "Prof 3",
    profSlug: "prof-3",
    courseCount: 17,
    reviewCount: 188,
  },
] satisfies SearchProfResult[];

export const Default: Story = {
  render: () => {
    return (
      <div className="w-full">
        <SearchResult>
          <SearchResult.Title searchTerm="test" />
          <SearchResult.Content
            searchedCourse={searchedCourse}
            searchedProf={searchedProf}
          />
        </SearchResult>
      </div>
    );
  },
};

export const WithoutFilter: Story = {
  render: () => {
    return (
      <div className="w-full">
        <SearchResult>
          <SearchResult.Title searchTerm="test" />
          <SearchResult.List>
            <SearchResult.Empty
              show={searchedCourse.length + searchedProf.length === 0}
            />
            {searchedCourse.map((c) => (
              <SearchResult.Item
                key={c.courseCode}
                school={c.uniAbbrv}
                href={`/course/${c.courseCode}`}
                title={c.courseName}
                subtitle={c.courseCode}
                filterStats={[
                  { icon: <PencilIcon />, stat: 12 },
                  { icon: <GraduationCapIcon />, stat: 32 },
                ]}
              />
            ))}
            {searchedProf.map((p) => (
              <SearchResult.Item
                key={p.profSlug}
                school={p.uniAbbrv}
                href={`/professor/${p.profSlug}`}
                title={p.profName}
                filterStats={[
                  { icon: <PencilIcon />, stat: 11 },
                  { icon: <BooksIcon />, stat: 31 },
                ]}
              />
            ))}
          </SearchResult.List>
        </SearchResult>
      </div>
    );
  },
};

export const JustSearchResultFilter: Story = {
  render: () => {
    return (
      <div className="w-full">
        <SearchResult.Filter
          onValueChange={(value) => console.log(value)}
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
  },
};

export const JustProfSearchResultItem: Story = {
  render: () => {
    return (
      <SearchResult.Item
        key={searchedProf[0]!.profSlug}
        school={searchedProf[0]!.uniAbbrv}
        href={`/professor/${searchedProf[0]!.profSlug}`}
        title={searchedProf[0]!.profName}
        filterStats={[
          { icon: <PencilIcon />, stat: 11 },
          { icon: <BooksIcon />, stat: 31 },
        ]}
      />
    );
  },
};

export const JustCourseSearchResultItem: Story = {
  render: () => {
    return (
      <SearchResult.Item
        key={searchedCourse[0]!.courseCode}
        school={searchedCourse[0]!.uniAbbrv}
        href={`/course/${searchedCourse[0]!.courseCode}`}
        title={searchedCourse[0]!.courseName}
        subtitle={searchedCourse[0]!.courseCode}
        filterStats={[
          { icon: <PencilIcon />, stat: 12 },
          { icon: <GraduationCapIcon />, stat: 32 },
        ]}
      />
    );
  },
};
