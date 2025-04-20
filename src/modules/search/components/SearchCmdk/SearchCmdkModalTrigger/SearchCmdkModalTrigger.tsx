"use client";
import { SearchIcon } from "@/common/components/icons";
import { Input, InputIcon, InputRoot } from "@/common/components/input";

import { SearchCmdkOnboardingTooltip } from "../SearchCmdkOnboardingTooltip";

export const SearchCmdkModalTrigger = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: () => void;
}) => {
  return (
    <InputRoot>
      <InputIcon>
        <SearchIcon />
      </InputIcon>
      <Input
        value="Search"
        readOnly
        className="w-full text-left"
        data-test="search-cmdk-trigger"
      />
      <SearchCmdkOnboardingTooltip open={open} onOpenChange={onOpenChange}>
        <kbd className="border-border-default bg-surface-elevated text-text-em-low pointer-events-none absolute top-2 right-3 inline-flex h-5 items-center gap-1 rounded border px-1.5 text-xs font-medium opacity-100 select-none">
          /
        </kbd>
      </SearchCmdkOnboardingTooltip>
    </InputRoot>
  );
};
