import { type PrismaClient } from "@/generated/prisma/client";
import { ReviewEventType, ReviewReactionType } from "@/generated/prisma/enums";
import { type ReviewEngagement } from "@/common/types/reviews";
import { z } from "zod";

export const reviewEngagementSchema = z
  .object({
    viewerVote: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    viewerReaction: z.enum(ReviewReactionType).nullable(),
    reactionCounts: z.array(
      z
        .object({
          reaction: z.enum(ReviewReactionType),
          count: z.number().int().positive(),
        })
        .strict(),
    ),
    shareCount: z.number().int().nonnegative(),
  })
  .strict() satisfies z.ZodType<ReviewEngagement>;

export async function loadReviewEngagement(
  db: PrismaClient,
  viewerId: string,
  reviewIds: string[],
): Promise<Record<string, ReviewEngagement>> {
  if (reviewIds.length === 0) {
    return {};
  }

  const ids = [...new Set(reviewIds)];
  const [votes, reactionGroups, viewerReactions, shareGroups] =
    await Promise.all([
      db.reviewVotes.findMany({
        where: { voterId: viewerId, reviewId: { in: ids } },
        select: { reviewId: true, weight: true },
      }),
      db.reviewReactions.groupBy({
        by: ["reviewId", "reaction"],
        where: { reviewId: { in: ids } },
        _count: { _all: true },
      }),
      db.reviewReactions.findMany({
        where: { reactingUserId: viewerId, reviewId: { in: ids } },
        select: { reviewId: true, reaction: true },
      }),
      db.reviewEvents.groupBy({
        by: ["reviewId"],
        where: { reviewId: { in: ids }, eventType: ReviewEventType.SHARE },
        _count: { _all: true },
      }),
    ]);

  const voteMap = new Map<string, -1 | 0 | 1>();
  for (const v of votes) {
    const voteWeight = v.weight === 1 ? 1 : v.weight === -1 ? -1 : 0;
    voteMap.set(v.reviewId, voteWeight);
  }

  const viewerReactionMap = new Map<string, ReviewReactionType>();
  for (const vr of viewerReactions) {
    viewerReactionMap.set(vr.reviewId, vr.reaction);
  }

  const reactionCountsMap = new Map<string, Map<ReviewReactionType, number>>();
  for (const g of reactionGroups) {
    let counts = reactionCountsMap.get(g.reviewId);
    if (!counts) {
      counts = new Map();
      reactionCountsMap.set(g.reviewId, counts);
    }
    counts.set(g.reaction, g._count._all);
  }

  const shareMap = new Map<string, number>();
  for (const s of shareGroups) {
    shareMap.set(s.reviewId, s._count._all);
  }

  const reactionTypeOrder = Object.values(ReviewReactionType);

  const result: Record<string, ReviewEngagement> = {};
  for (const id of ids) {
    const reactionCounts: Array<{
      reaction: ReviewReactionType;
      count: number;
    }> = [];
    const counts = reactionCountsMap.get(id);
    for (const reaction of reactionTypeOrder) {
      const count = counts?.get(reaction) ?? 0;
      if (count > 0) {
        reactionCounts.push({ reaction, count });
      }
    }

    result[id] = {
      viewerVote: voteMap.get(id) ?? 0,
      viewerReaction: viewerReactionMap.get(id) ?? null,
      reactionCounts,
      shareCount: shareMap.get(id) ?? 0,
    };
  }

  return result;
}
