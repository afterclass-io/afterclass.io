import { Button } from "@/common/components/Button";
import { Tooltip } from "@/common/components/Tooltip";
import {
  FoldedHandsEmoji,
  LoudlyCryingFaceEmoji,
  PurpleHeartEmoji,
  RoflEmoji,
  SmileyIcon,
  SparklesEmoji,
} from "@/common/components/CustomIcon";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/common/components/HoverCard";

const REACTIONS = [
  {
    tooltip: "Purple Heart Reaction",
    icon: PurpleHeartEmoji,
  },
  {
    tooltip: "Sparkles Reaction",
    icon: SparklesEmoji,
  },
  {
    tooltip: "Folded Hands Reaction",
    icon: FoldedHandsEmoji,
  },
  {
    tooltip: "ROFL Reaction",
    icon: RoflEmoji,
  },
  {
    tooltip: "Crying Face Reaction",
    icon: LoudlyCryingFaceEmoji,
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
        {REACTIONS.map(({ icon: EmojiIcon, tooltip }) => (
          <Tooltip>
            <Tooltip.Trigger className="h-fit w-fit">
              <EmojiIcon
                key={tooltip}
                className="h-6 w-6 px-1 hover:h-12 hover:w-12"
                onClick={() => handleEmojiClick(tooltip)}
              />
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">{tooltip}</Tooltip.Content>
          </Tooltip>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
};
