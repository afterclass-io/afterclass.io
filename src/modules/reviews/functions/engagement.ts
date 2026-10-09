import { type ReviewReactionType } from "@/generated/prisma/enums";
import { updateReactionCounts } from "@/common/functions/reactions";
import type { Review } from "@/common/types/reviews";
import type { ReviewEngagement } from "@/common/types/reviews/engagement";

export const EMPTY_ENGAGEMENT: ReviewEngagement = {
  viewerVote: 0,
  viewerReaction: null,
  reactionCounts: [],
  shareCount: 0,
};

export const withVote = (r: Review, weight: -1 | 0 | 1): Review => {
  const currentEngagement = r.engagement ?? EMPTY_ENGAGEMENT;
  const currentVote = currentEngagement.viewerVote;
  const voteDiff = weight - currentVote;

  return {
    ...r,
    likeCount: r.likeCount + voteDiff,
    engagement: {
      ...currentEngagement,
      viewerVote: weight,
    },
  };
};

export const withReaction = (
  r: Review,
  reaction: ReviewReactionType | undefined,
): Review => {
  const currentEngagement = r.engagement ?? EMPTY_ENGAGEMENT;
  const oldReaction = currentEngagement.viewerReaction;
  const targetReaction = reaction ?? null;

  if (oldReaction === targetReaction) {
    return { ...r };
  }

  return {
    ...r,
    engagement: {
      ...currentEngagement,
      viewerReaction: targetReaction,
      reactionCounts: updateReactionCounts(
        currentEngagement.reactionCounts,
        oldReaction,
        targetReaction,
      ),
    },
  };
};

export const withShare = (r: Review): Review => {
  const currentEngagement = r.engagement ?? EMPTY_ENGAGEMENT;
  return {
    ...r,
    engagement: {
      ...currentEngagement,
      shareCount: currentEngagement.shareCount + 1,
    },
  };
};
