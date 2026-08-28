"use client";
import type { ReviewReactionType as DbReviewReactionType } from "@/generated/prisma/client";

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
import { ReviewReactionType } from "@/modules/reviews/types";
import { useOptimisticReaction } from "@/modules/roadmaps/hooks/useOptimisticReaction";

const handleClick = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

export const RoadmapReactionButton = ({ roadmapId }: { roadmapId: string }) => {
  const { mutate: upsertReaction } = useOptimisticReaction();

  const handleEmojiClick = (emoji: DbReviewReactionType) => {
    upsertReaction({
      roadmapId,
      reaction: emoji,
    });
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="React"
          data-umami-event="roadmap-react"
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
            <TooltipTrigger asChild>
              <button
                type="button"
                className="px-1 text-sm hover:text-3xl"
                onClick={() => handleEmojiClick(label as DbReviewReactionType)}
              >
                {emoji}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{toTitleCase(label)}</TooltipContent>
          </Tooltip>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
};
