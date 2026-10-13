import { ConstrainedContainer } from "@/common/components/constrained-container";
import { SearchResult } from "@/modules/search/components/SearchResult";

export default function Loading() {
  return (
    <ConstrainedContainer>
      <SearchResult.Skeleton />
    </ConstrainedContainer>
  );
}
