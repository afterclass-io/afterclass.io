import type { Meta, StoryObj } from "@storybook/nextjs";

import { SearchResult } from "./SearchResult";
import { ResultsSection } from "./SearchResultContent/ResultsSection";
import catalog from "@/server/search/fixtures/results.json";
import {
  type SearchCourseResult,
  type SearchProfResult,
} from "@/modules/search/types";
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

const resultCourses = catalog.courses.slice(0, 20).map((c) => ({
  id: c.code,
  code: c.code,
  name: c.name,
  creditUnits: 1,
  uniAbbrv: "SMU" as const,
  reviewCount: 0,
  profCount: 0,
}));
const page = {
  rows: resultCourses,
  totals: { matches: 27, related: 1 },
  nextCursor: 20,
};
const result = {
  data: { pages: [page] },
  hasNextPage: true,
  isFetching: false,
  isLoading: false,
  isError: false,
  isFetchNextPageError: false,
  fetchNextPage: () => Promise.resolve(),
  refetch: () => Promise.resolve(),
};

export const Paginated: Story = {
  render: () => (
    <div className="w-full max-w-3xl">
      <SearchResult>
        <SearchResult.Title searchTerm="Singapore" />
        <SearchResult.Filter
          filters={{
            type: [
              { label: "All", value: "all", isDefault: true },
              { label: "Professor", value: "professor" },
              { label: "Course", value: "course" },
            ],
          }}
          onValueChange={() => undefined}
        />
        <ResultsSection entity="courses" total={27} result={result} />
      </SearchResult>
    </div>
  ),
};

export const LoadingMore: Story = {
  render: () => (
    <ResultsSection
      entity="courses"
      total={27}
      result={{ ...result, isFetching: true }}
    />
  ),
};

export const Retry: Story = {
  render: () => (
    <ResultsSection
      entity="courses"
      total={27}
      result={{ ...result, isError: true, isFetchNextPageError: true }}
    />
  ),
};

export const RelatedMatches: Story = {
  render: () => (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        These results have similar wording and may not contain your keyword.
      </p>
      <ResultsSection
        entity="professors"
        total={1}
        related
        result={{
          ...result,
          hasNextPage: false,
          data: {
            pages: [
              {
                rows: [
                  {
                    id: "sing",
                    slug: "sing",
                    name: "Sing",
                    uniAbbrv: "SMU",
                    courseCount: 0,
                    reviewCount: 0,
                  },
                ],
                totals: { matches: 0, related: 1 },
                nextCursor: null,
              },
            ],
          },
        }}
      />
    </div>
  ),
};

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
            query="test"
            initialCourses={{
              rows: searchedCourse.map((c) => ({
                id: c.courseCode,
                code: c.courseCode,
                name: c.courseName,
                creditUnits: 1,
                uniAbbrv: c.uniAbbrv,
                profCount: c.profCount,
                reviewCount: c.reviewCount,
              })),
              totals: { matches: searchedCourse.length, related: 0 },
              nextCursor: null,
            }}
            initialProfessors={{
              rows: searchedProf.map((p) => ({
                id: p.profSlug,
                slug: p.profSlug,
                name: p.profName,
                uniAbbrv: p.uniAbbrv,
                courseCount: p.courseCount,
                reviewCount: p.reviewCount,
              })),
              totals: { matches: searchedProf.length, related: 0 },
              nextCursor: null,
            }}
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
              reason="none"
              query="test"
            />
            {searchedCourse.map((c) => (
              <SearchResult.Item
                key={c.courseCode}
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

export const LongCourseTitleItem: Story = {
  render: () => {
    return (
      <div className="w-80">
        <SearchResult.Item
          href={`/course/${searchedCourse[0]!.courseCode}`}
          title="An extremely long course title that would otherwise push the chevron out of the card"
          subtitle={searchedCourse[0]!.courseCode}
          filterStats={[
            { icon: <PencilIcon />, stat: 12 },
            { icon: <GraduationCapIcon />, stat: 32 },
          ]}
        />
      </div>
    );
  },
};
