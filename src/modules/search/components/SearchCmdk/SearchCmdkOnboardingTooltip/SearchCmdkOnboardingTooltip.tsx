"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";

export const SearchCmdkOnboardingTooltip = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: () => void;
  children: React.ReactNode;
}) => {
  return (
    <Tooltip open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={36}>
        <div className="p-1 px-5 text-sm">
          <div className="text-secondary-default">
            Looking for a
            <br />
            Professor or Course?
          </div>
          <div className="mt-2">
            Try pressing &quot;/&quot; or
            <br />
            clicking here to search
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
