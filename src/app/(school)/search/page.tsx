import { ConstrainedContainer } from "@/common/components/constrained-container";
import { SearchResult } from "@/modules/search/components/SearchResult";
import { searchCourse } from "@/modules/search/functions/searchCourse";
import type { SearchCourseResult } from "@/modules/search/functions/searchCourse";
import { searchProf } from "@/modules/search/functions/searchProf";
import type { SearchProfResult } from "@/modules/search/functions/searchProf";

export default async function Search(props: { searchParams: Promise<{ q: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.q ?? "";

  let searchedCourse: SearchCourseResult[] = [];
  let searchedProf: SearchProfResult[] = [];
  if (query) {
    try {
      [searchedCourse, searchedProf] = await Promise.all([searchCourse(query), searchProf(query)]);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <ConstrainedContainer>
      <SearchResult>
        <SearchResult.Title searchTerm={query} />
        <SearchResult.Content searchedCourse={searchedCourse} searchedProf={searchedProf} />
      </SearchResult>
    </ConstrainedContainer>
  );
}
