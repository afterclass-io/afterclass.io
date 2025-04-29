import { SearchResultTitle } from "./SearchResultTitle";
import { SearchResultContent } from "./SearchResultContent";
import { SearchResultList } from "./SearchResultList";
import { SearchResultEmpty } from "./SearchResultEmpty";
import { SearchResultItem } from "./SearchResultItem";
import { SearchResultFilter } from "./SearchResultFilter";

export const SearchResult = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex h-full w-full flex-col gap-10">{children}</div>;
};

SearchResult.Title = SearchResultTitle;
SearchResult.Content = SearchResultContent;
SearchResult.List = SearchResultList;
SearchResult.Item = SearchResultItem;
SearchResult.Empty = SearchResultEmpty;
SearchResult.Filter = SearchResultFilter;
