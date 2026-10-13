"use client";
import { type ReviewReactionType as DbReviewReactionType } from "@/generated/prisma/enums";

import { toTitleCase } from "@/common/functions";
import { Button } from "@/common/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { SmileyIcon } from "@/common/components/icons";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/common/components/hover-card";
import { ReviewReactionType } from "@/common/types/reviews";

export const ReactionPickerButton = ({
  umamiEvent,
  onSelect,
}: {
  umamiEvent: string;
  onSelect: (reaction: DbReviewReactionType) => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="React"
          data-umami-event={umamiEvent}
          className="size-8 rounded-full"
          onClick={handleClick}
        >
          <SmileyIcon />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        className="flex h-10 w-fit items-end p-2"
        onClick={handleClick}
      >
        {Object.entries(ReviewReactionType).map(([label, emoji]) => (
          <Tooltip key={label}>
            <TooltipTrigger className="h-fit w-fit">
              <span
                className="px-1 text-sm hover:text-3xl"
                onClick={() => onSelect(label as DbReviewReactionType)}
              >
                {emoji}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{toTitleCase(label)}</TooltipContent>
          </Tooltip>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
};
