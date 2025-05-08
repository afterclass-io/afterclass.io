import * as React from "react";

import NumberFlow from "@number-flow/react";
import { cn } from "@/common/functions";
import { ArrowFatLineUpIcon } from "@/common/components/icons";
import { Button } from "@/common/components/button";

const UPVOTE_CLASSNAME =
  "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground ";
const DOWNVOTE_CLASSNAME =
  "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground";

interface UpvoteRatingAnimatedProps {
  upvotes: number;
  downvotes: number;
  upvoted: boolean;
  downvoted: boolean;
  upvoteIncrement?: number;
  downvoteIncrement?: number;
  onVoteChange: (newState: {
    upvotes: number;
    downvotes: number;
    upvoted: boolean;
    downvoted: boolean;
  }) => void;
}

export const VoteGroup = ({
  downvoted,
  downvoteIncrement = 1,
  downvotes,
  onVoteChange,
  upvoted,
  upvoteIncrement = 1,
  upvotes,
}: UpvoteRatingAnimatedProps) => {
  const handleUpvote = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (upvoted) {
      // Undo upvote
      onVoteChange({
        downvoted: false,
        downvotes,
        upvoted: false,
        upvotes: upvotes - upvoteIncrement,
      });
    } else {
      // Add upvote and remove downvote if exists
      onVoteChange({
        downvoted: false,
        downvotes: downvoted ? downvotes - downvoteIncrement : downvotes,
        upvoted: true,
        upvotes: upvotes + upvoteIncrement,
      });
    }
  };

  const handleDownvote = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (downvoted) {
      // Undo downvote
      onVoteChange({
        downvoted: false,
        downvotes: downvotes - downvoteIncrement,
        upvoted: false,
        upvotes,
      });
    } else {
      // Add downvote and remove upvote if exists
      onVoteChange({
        downvoted: true,
        downvotes: downvotes + downvoteIncrement,
        upvoted: false,
        upvotes: upvoted ? upvotes - upvoteIncrement : upvotes,
      });
    }
  };

  const totalVotes = upvotes - downvotes;

  return (
    <div
      data-voted={upvoted || downvoted}
      data-vote-count={totalVotes}
      className={cn(
        "bg-background dark:bg-input/30 dark:border-input",
        "flex h-8 w-fit flex-row items-center gap-0 rounded-full border shadow-xs",
        upvoted && UPVOTE_CLASSNAME,
        downvoted && DOWNVOTE_CLASSNAME,
      )}
    >
      <Button
        variant="ghost"
        onClick={handleUpvote}
        className="aspect-square size-fit h-full rounded-full p-1 transition-colors duration-200 hover:scale-110"
        size="icon"
        aria-label="upvote"
        data-test="upvote-button"
        data-voted={upvoted}
      >
        <ArrowFatLineUpIcon
          className={cn("size-5 text-inherit", upvoted && "fill-current")}
        />
      </Button>

      <span className="flex size-full min-w-6 items-center justify-center text-inherit">
        <NumberFlow
          format={{
            notation: "compact",
            compactDisplay: "short",
          }}
          value={totalVotes}
          className="font-mono text-sm"
        />
      </span>

      <Button
        variant="ghost"
        onClick={handleDownvote}
        className="aspect-square size-fit h-full rounded-full p-1 transition-colors duration-200 hover:scale-110"
        size="icon"
        aria-label="downvote"
        data-test="downvote-button"
        data-voted={downvoted}
      >
        <ArrowFatLineUpIcon
          className={cn(
            "size-5 rotate-180 text-inherit",
            downvoted && "fill-current",
          )}
        />
      </Button>
    </div>
  );
};
