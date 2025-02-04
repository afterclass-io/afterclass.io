import { Button } from "@/common/components/Button";
import { Tooltip } from "@/common/components/Tooltip";
import { SmileyIcon } from "@/common/components/CustomIcon";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/common/components/HoverCard";

const REACTIONS = [
  {
    tooltip: "Like",
    emoji: "💜",
  },
  {
    tooltip: "Thankful",
    emoji: "🙏",
  },
  {
    tooltip: "Slay",
    emoji: "💅",
  },
  {
    tooltip: "Funny",
    emoji: "🤣",
  },
  {
    tooltip: "Crying",
    emoji: "😭",
  },
  {
    tooltip: "Shocked",
    emoji: "😦",
  },
];

export const ReviewReactionButton = () => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleEmojiClick = (t: string) => {
    console.log("clicked!", t);
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
        {REACTIONS.map(({ emoji, tooltip }) => (
          <Tooltip>
            <Tooltip.Trigger className="h-fit w-fit">
              <span
                key={tooltip}
                className="px-1 text-sm hover:text-3xl"
                onClick={() => handleEmojiClick(tooltip)}
              >
                {emoji}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">{tooltip}</Tooltip.Content>
          </Tooltip>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
};
