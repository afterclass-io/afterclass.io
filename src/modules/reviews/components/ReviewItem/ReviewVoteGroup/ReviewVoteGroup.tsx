"use client";
import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { ReviewEventType } from "@prisma/client";

import { api } from "@/common/tools/trpc/react";

import { useEdgeConfigs } from "@/common/hooks";
import { cn, formatNumberShortScale } from "@/common/functions";
import { Button } from "@/common/components/Button";
import { ArrowUpIcon } from "@/common/components/CustomIcon";

export const ReviewVoteGroup = ({
  reviewId,
  triggeringUserId,
}: {
  reviewId: string;
  triggeringUserId?: string;
}) => {
  const { data: session } = useSession();
  const ecfg = useEdgeConfigs();

  const utils = api.useUtils();
  const { mutate: track } = api.reviewEvents.track.useMutation();
  const reviewVotesCountQuery = api.reviewVotes.count.useQuery({ reviewId });
  const getUserVoteQuery = api.reviewVotes.getByUser.useQuery({ reviewId });
  const { mutate: likeOrUnlike } = api.reviewVotes.voteOrUnvote.useMutation({
    onMutate: async ({ weight }) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await utils.reviewVotes.count.cancel();
      await utils.reviewVotes.getByUser.cancel();

      // Snapshot the previous value
      const previousCount = utils.reviewVotes.count.getData();
      const previousUserVote = utils.reviewVotes.getByUser.getData();

      // Optimistically update to the new value
      utils.reviewVotes.count.setData(
        { reviewId },
        (oldQueryData: number | undefined) => oldQueryData ?? 0,
      );
      utils.reviewVotes.getByUser.setData({ reviewId }, (oldQueryData) => {
        if (!oldQueryData) return null;
        return {
          ...oldQueryData,
          weight,
        };
      });

      // Return a context object with the snapshotted value
      return { previousCount, previousUserVote };
    },
    onError: (_, _newTodo, context) => {
      // Rollback to the previous value if mutation fails
      utils.reviewVotes.count.setData({ reviewId }, context?.previousCount);
      utils.reviewVotes.getByUser.setData(
        { reviewId },
        context?.previousUserVote,
      );
    },
    onSuccess: () => {
      if (ecfg.enableReviewEventsTracking) {
        track({
          reviewId,
          triggeringUserId: triggeringUserId ?? session?.user.id,
          eventType: ReviewEventType.UPVOTE,
        });
      }
    },
    onSettled: () => {
      void utils.reviewVotes.count.invalidate();
      void utils.reviewVotes.getByUser.invalidate();
    },
  });

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleVote = (weight: number) => {
    if (!session) return;
    likeOrUnlike({
      reviewId,
      userId: session.user.id,
      weight,
    });
  };

  const getUserVoteWeight = useCallback(() => {
    if (getUserVoteQuery.data) {
      return getUserVoteQuery.data.weight;
    }
    return 0;
  }, [getUserVoteQuery.data]);

  return (
    <div
      className={cn(
        "flex h-8 items-center gap-1 rounded-full border border-border-default bg-element-tertiary",
        getUserVoteWeight() !== 0
          ? getUserVoteWeight() > 0
            ? "border-primary-default"
            : "border-secondary-default"
          : "",
      )}
    >
      <Button
        variant="tertiary"
        size="sm"
        className={cn(
          "h-full border-none",
          getUserVoteWeight() > 0 ? "text-primary-default" : "",
        )}
        aria-label="upvote"
        iconLeft={<ArrowUpIcon className="h-4 w-4" />}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          handleClick(e);
          handleVote(getUserVoteWeight() > 0 ? 0 : 1);
        }}
        rounded
      />
      <span className="text-xs text-text-em-mid">
        {formatNumberShortScale(reviewVotesCountQuery.data ?? 0)}
      </span>
      <Button
        variant="tertiary"
        size="sm"
        className={cn(
          "h-full border-none",
          getUserVoteWeight() < 0 ? "text-secondary-default" : "",
        )}
        aria-label="downvote"
        iconLeft={<ArrowUpIcon className="h-4 w-4 rotate-180" />}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          handleClick(e);
          handleVote(getUserVoteWeight() < 0 ? 0 : -1);
        }}
        rounded
      />
    </div>
  );
};
