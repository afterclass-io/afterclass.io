"use client";
import { SearchIcon } from "@/common/components/icons";
import { Input } from "@/common/components/i-nput";

import { searchCmdkTheme } from "../SearchCmdk.theme";
import { SearchCmdkOnboardingTooltip } from "../SearchCmdkOnboardingTooltip";

export const SearchCmdkModalTrigger = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: () => void;
}) => {
  const { triggerInput, kbd: kbdStyle, searchIcon } = searchCmdkTheme();
  return (
    <Input
      className={triggerInput()}
      contentLeft={<SearchIcon size={16} className={searchIcon()} />}
      contentRight={
        <SearchCmdkOnboardingTooltip open={open} onOpenChange={onOpenChange}>
          <kbd className={kbdStyle()}>/</kbd>
        </SearchCmdkOnboardingTooltip>
      }
      value="Search"
      size="sm"
      readOnly
      data-test="search-cmdk-trigger"
    />
  );
};
