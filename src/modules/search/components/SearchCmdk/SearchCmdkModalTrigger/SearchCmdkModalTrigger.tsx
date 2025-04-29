"use client";
import { SearchIcon } from "@/common/components/icons";

import { SearchCmdkOnboardingTooltip } from "../SearchCmdkOnboardingTooltip";
import { Input, InputRoot, InputAdornment } from "@/common/components/input";
import { Kbd } from "@/common/components/kbd";

export const SearchCmdkModalTrigger = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: () => void;
}) => {
  return (
    <InputRoot className="cursor-pointer">
      <InputAdornment>
        <SearchIcon />
      </InputAdornment>
      <Input
        value="Search"
        readOnly
        className="w-full text-left"
        disabled
        data-test="search-cmdk-trigger"
      />
      <InputAdornment>
        <SearchCmdkOnboardingTooltip open={open} onOpenChange={onOpenChange}>
          <Kbd variant="outline">/</Kbd>
        </SearchCmdkOnboardingTooltip>
      </InputAdornment>
    </InputRoot>
  );
};
