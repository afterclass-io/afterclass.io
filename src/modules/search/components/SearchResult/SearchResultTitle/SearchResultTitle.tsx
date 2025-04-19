import { SearchIcon } from "@/common/components/icons";
import { PageTitle } from "@/common/components/PageTitle";
import { searchResultTheme } from "../SearchResult.theme";

export const SearchResultTitle = ({
  searchTerm = "...",
}: {
  searchTerm?: string;
}) => {
  const { title, titleIcon } = searchResultTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <PageTitle
      className={title()}
      contentLeft={<SearchIcon size={36} className={titleIcon()} />}
    >
      Search results for “{searchTerm}”
    </PageTitle>
  );
};
