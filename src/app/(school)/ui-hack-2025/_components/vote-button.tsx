import { Button } from "@/common/components/button";
import { ArrowFatLineUpIcon } from "@/common/components/icons";
import { cn } from "@/common/functions";
import NumberFlow from "@number-flow/react";

export const VoteButton = ({
  voted,
  totalVotes,
  onVote,
  onUnvote,
}: {
  voted: boolean;
  totalVotes: number;
  onVote: () => void;
  onUnvote: () => void;
}) => {
  return (
    <Button
      variant={voted ? "default" : "outline"}
      className="w-fit rounded-full p-1 transition-colors duration-200 hover:scale-110"
      aria-label="vote"
      data-voted={voted}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (voted) {
          onUnvote();
        } else {
          onVote();
        }
      }}
    >
      <ArrowFatLineUpIcon
        className={cn("size-5 text-inherit", voted && "fill-current")}
      />
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
    </Button>
  );
};
