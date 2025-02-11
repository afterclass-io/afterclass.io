"use client";
import { api } from "@/common/tools/trpc/react";
import { toTitleCase } from "@/common/functions";
import { Button } from "@/common/components/Button";
import { Tooltip } from "@/common/components/Tooltip";
import { SmileyIcon } from "@/common/components/CustomIcon";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/common/components/HoverCard";
import { ReviewReactionType } from "@/modules/reviews/types";
import { ReviewReactionType as DbReviewReactionType } from "@prisma/client";

export const ReviewReactionButton = ({ reviewId }: { reviewId: string }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const utils = api.useUtils();

  const { mutate: upsertReaction } = api.reviewReactions.upsert.useMutation({
    onSuccess: () => {
      utils.reviewReactions.getByReviewId.refetch({ reviewId });
    },
  });

  const handleEmojiClick = (emoji: DbReviewReactionType) => {
    console.log("clicked!", emoji);
    upsertReaction({
      reviewId,
      reaction: emoji,
    });
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          rounded
          variant="tertiary"
          size="sm"
          iconLeft={<SmileyIcon className="h-4 w-4" />}
          aria-label="React"
          data-umami-event="review-react"
          onClick={handleClick}
        />
      </HoverCardTrigger>
      <HoverCardContent
        className="flex h-10 w-fit items-end p-2"
        onClick={handleClick}
      >
        {Object.entries(ReviewReactionType).map(([label, emoji]) => (
          <Tooltip>
            <Tooltip.Trigger className="h-fit w-fit">
              <span
                key={label}
                className="px-1 text-sm hover:text-3xl"
                onClick={() => handleEmojiClick(label as DbReviewReactionType)}
              >
                {emoji}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">
              {toTitleCase(label)}
            </Tooltip.Content>
          </Tooltip>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
};
