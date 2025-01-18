"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ReviewEventType } from "@prisma/client";

import { api } from "@/common/tools/trpc/react";
import { Button } from "@/common/components/Button";
import type {
  ButtonBaseProps,
  ButtonProps,
  ButtonVariants,
} from "@/common/components/Button";
import { ThumbUpFilledIcon } from "@/common/components/CustomIcon";
import { useEdgeConfigs } from "@/common/hooks";

export type ReviewLikeButtonProps = ButtonProps &
  ButtonBaseProps &
  Omit<ButtonVariants, "hasIcon" | "iconOnly"> & {
    reviewId: string;
    triggeringUserId?: string;
  };

export const MockedReviewLikeButton = ({
  reviewLikeCount,
  ...props
}: {
  reviewLikeCount: number;
} & Omit<ReviewLikeButtonProps, "reviewId" | "triggeringUserId">) => (
  <Button
    rounded
    variant="tertiary"
    iconRight={<ThumbUpFilledIcon />}
    aria-label="Like"
    {...props}
  >
    {reviewLikeCount}
  </Button>
);

export const ReviewLikeButton = ({
  reviewId,
  triggeringUserId,
  ...props
}: ReviewLikeButtonProps) => {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const ecfg = useEdgeConfigs();

  const hasUserVotedQuery = api.reviewVotes.getUserVote.useQuery({
    reviewId,
    userId: session?.user.id ?? "",
  });
  useEffect(
    () => setIsLiked(!!hasUserVotedQuery.data),
    [hasUserVotedQuery.data],
  );

  const reviewVotesCountQuery = api.reviewVotes.count.useQuery({ reviewId });

  const { mutate: likeOrUnlike, isSuccess } =
    api.reviewVotes.voteOrUnvote.useMutation({
      onSuccess: () => {
        void reviewVotesCountQuery.refetch();
        void hasUserVotedQuery.refetch();
      },
    });

  const { mutate: track } = api.reviewEvents.track.useMutation();

  const handleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;
    likeOrUnlike({
      reviewId,
      userId: session.user.id,
      weight: isLiked ? 0 : 1,
    });
  };
  useEffect(() => {
    if (isSuccess) {
      setIsLiked((prevIsLiked) => {
        if (!prevIsLiked) {
          // If we're changing from not liked to liked
          if (ecfg.enableReviewEventsTracking) {
            track({
              reviewId,
              triggeringUserId: triggeringUserId ?? session?.user.id,
              eventType: ReviewEventType.UPVOTE,
            });
          }
        }
        return !prevIsLiked;
      });
    }
  }, [isSuccess]);

  return (
    <Button
      rounded
      variant={isLiked ? "secondary" : "tertiary"}
      iconRight={<ThumbUpFilledIcon />}
      onClick={handleLike}
      loading={reviewVotesCountQuery.isLoading}
      aria-label="Like"
      data-test="like-button"
      data-liked={isLiked}
      size="sm"
      {...props}
    >
      {reviewVotesCountQuery.data?._sum.weight ?? 0}
    </Button>
  );
};
