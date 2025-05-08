import { SearchIcon } from "@/common/components/icons";
import { PageTitle } from "@/common/components/page-title";

export const SearchResultTitle = ({
  searchTerm = "...",
}: {
  searchTerm?: string;
}) => {
  return (
    <PageTitle
      className="truncate text-left"
      contentLeft={
        <SearchIcon className="text-muted-foreground size-8 flex-none" />
      }
    >
      Search results for “{searchTerm}”
    </PageTitle>
  );
};
