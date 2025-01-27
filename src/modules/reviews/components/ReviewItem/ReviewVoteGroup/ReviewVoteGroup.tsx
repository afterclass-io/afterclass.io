import { Button } from "@/common/components/Button";
import { ArrowUpIcon } from "@/common/components/CustomIcon";

export const ReviewVoteGroup = ({
  likeCount,
}: {
  likeCount: string | number;
}) => {
  return (
    <div className="flex h-8 items-center gap-1 rounded-full border border-border-default bg-element-tertiary">
      <Button
        variant="tertiary"
        size="sm"
        className="h-full border-none"
        aria-label="upvote"
        iconLeft={<ArrowUpIcon className="h-4 w-4" />}
        rounded
      />
      <span className="text-text-on-low text-xs">{likeCount}</span>
      <Button
        variant="tertiary"
        size="sm"
        className="h-full border-none"
        aria-label="downvote"
        iconLeft={<ArrowUpIcon className="h-4 w-4 rotate-180" />}
        rounded
      />
    </div>
  );
};
