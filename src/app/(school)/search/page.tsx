import { SearchResult } from "@/modules/search/components/SearchResult";
import {
  type SearchCourseResult,
  searchCourse,
} from "@/modules/search/functions/searchCourse";
import {
  type SearchProfResult,
  searchProf,
} from "@/modules/search/functions/searchProf";

export default async function Search({
  searchParams,
}: {
  searchParams: { q: string };
}) {
  const query = searchParams?.q;

  let searchedCourse: SearchCourseResult[] = [];
  let searchedProf: SearchProfResult[] = [];
  try {
    [searchedCourse, searchedProf] = await Promise.all([
      searchCourse(query),
      searchProf(query),
    ]);
  } catch (e) {
    console.error(e);
  }

  return (
    <SearchResult>
      <SearchResult.Title searchTerm={query} />
      <SearchResult.Content
        searchedCourse={searchedCourse}
        searchedProf={searchedProf}
      />
    </SearchResult>
  );
}
