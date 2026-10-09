import type { ReviewReactionType } from "@/generated/prisma/enums";

export type ReviewEngagement = {
  viewerVote: -1 | 0 | 1;
  viewerReaction: ReviewReactionType | null;
  reactionCounts: Array<{ reaction: ReviewReactionType; count: number }>;
  shareCount: number;
};
