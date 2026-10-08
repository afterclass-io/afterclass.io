"use client";
import { useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { ReviewEventType } from "@/generated/prisma/enums";

import { api, type RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { useEdgeConfigs } from "@/common/hooks";
import { VoteGroup } from "@/common/components/vote-group";
import { debounce } from "@/common/functions/debounce";
import { type Review } from "@/modules/reviews/types";
import {
  cancelReviewCaches,
  getReviewCachesSnapshot,
  patchReviewInCaches,
  restoreReviewCaches,
  type Snapshot,
} from "@/modules/reviews/hooks/patch-review-caches";
import { withVote } from "@/modules/reviews/functions/engagement";

export const ReviewVoteGroup = ({ review }: { review: Review }) => {
  const { data: session } = useSession();
  const ecfg = useEdgeConfigs();

  const utils = api.useUtils();
  const snapshotRef = useRef<Snapshot | undefined>(undefined);
  const { mutate: track } = api.reviewEvents.track.useMutation();

  const mutation = api.reviewVotes.voteOrUnvote.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["reviewVotes"]["voteOrUnvote"],
      Snapshot
    >(
      // eslint-disable-next-line react-hooks/refs -- callbacks run in the mutation lifecycle (cancel/snapshot/restore), never during render; the ref carries the debounced input
      {
        cancel: async () => {
          await cancelReviewCaches(utils);
        },
        getSnapshot: () =>
          snapshotRef.current ?? getReviewCachesSnapshot(utils),
        applyOptimistic: ({ weight }) => {
          patchReviewInCaches(utils, review.id, (r) => withVote(r, weight));
        },
        restoreSnapshot: (prev) => {
          restoreReviewCaches(utils, prev);
        },
        invalidate: async () => {
          try {
            if (utils.client?.reviews?.getEngagement) {
              const res = await utils.client.reviews.getEngagement.query({
                reviewIds: [review.id],
              });
              const engagement = res[review.id];
              if (engagement) {
                patchReviewInCaches(utils, review.id, (r) => ({
                  ...r,
                  engagement,
                }));
              }
            }
          } catch {
            // ignore
          }
        },
      },
    ),
    onSuccess: (_, { weight }) => {
      if (ecfg.enableReviewEventsTracking) {
        const eventType =
          weight > 0 ? ReviewEventType.UPVOTE : ReviewEventType.DOWNVOTE;

        track({ reviewId: review.id, eventType });
      }
    },
  });
  const likeOrUnlike = mutation.mutate;

  const debouncedLikeOrUnlike = useMemo(
    () =>
      debounce((variables: Parameters<typeof likeOrUnlike>[0]) => {
        likeOrUnlike(variables);
      }, 300),
    [likeOrUnlike],
  );

  const viewerVote = review.engagement?.viewerVote ?? 0;

  return (
    <VoteGroup
      upvotes={review.likeCount}
      downvotes={0}
      upvoted={viewerVote > 0}
      downvoted={viewerVote < 0}
      onVoteChange={({ upvoted, downvoted }) => {
        if (!session) return;
        const weight: -1 | 0 | 1 = upvoted ? 1 : downvoted ? -1 : 0;
        snapshotRef.current = patchReviewInCaches(utils, review.id, (r) =>
          withVote(r, weight),
        );
        debouncedLikeOrUnlike({
          reviewId: review.id,
          weight,
        });
      }}
    />
  );
};
