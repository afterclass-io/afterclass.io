"use client";
import PhMagnifyingGlass from "~icons/ph/magnifying-glass";
import { Input } from "@/common/components/Input";

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
      contentLeft={
        <PhMagnifyingGlass className={searchIcon({ className: "h-4 w-4" })} />
      }
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
