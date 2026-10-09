import { type ReviewReactionType } from "@/generated/prisma/enums";
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

  // Decrement old reaction if present (removed when count reaches 0)
  const afterDecrement = oldReaction
    ? currentEngagement.reactionCounts
        .map((c) =>
          c.reaction === oldReaction ? { ...c, count: c.count - 1 } : c,
        )
        .filter((c) => c.count > 0)
    : currentEngagement.reactionCounts;

  // Increment target reaction if present
  let nextReactionCounts: Array<{
    reaction: ReviewReactionType;
    count: number;
  }>;
  if (targetReaction !== null) {
    const existing = afterDecrement.find((c) => c.reaction === targetReaction);
    if (existing) {
      nextReactionCounts = afterDecrement.map((c) =>
        c.reaction === targetReaction ? { ...c, count: c.count + 1 } : c,
      );
    } else {
      nextReactionCounts = [
        ...afterDecrement,
        { reaction: targetReaction, count: 1 },
      ];
    }
  } else {
    nextReactionCounts = afterDecrement;
  }

  return {
    ...r,
    engagement: {
      ...currentEngagement,
      viewerReaction: targetReaction,
      reactionCounts: nextReactionCounts,
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
