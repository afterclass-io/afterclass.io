import { useEdgeConfigs } from "@/common/hooks";
import { api, type RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { ReviewEventType } from "@/generated/prisma/enums";
import { useCallback, useRef } from "react";

import { useDebouncedOptimisticMutate } from "@/common/hooks/use-debounced-optimistic-mutate";
import {
  cancelReviewCaches,
  patchReviewInCaches,
  restoreReviewCaches,
  type Snapshot,
} from "./patch-review-caches";
import { withReaction } from "../functions/engagement";

export function useOptimisticReaction() {
  const ecfg = useEdgeConfigs();

  const utils = api.useUtils();
  const lastInputRef = useRef<{ reviewId: string } | null>(null);
  const snapshotRef = useRef<Snapshot | undefined>(undefined);
  const { mutate: track } = api.reviewEvents.track.useMutation();

  const mutation = api.reviewReactions.upsert.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["reviewReactions"]["upsert"],
      Snapshot
    >(
      // eslint-disable-next-line react-hooks/refs -- callbacks run in the mutation lifecycle (cancel/snapshot/restore), never during render; the ref carries the debounced input
      {
        cancel: async () => {
          await cancelReviewCaches();
        },
        getSnapshot: () => snapshotRef.current,
        // Pattern A: the caller (mutateWithDebounce) already applied the optimistic
        // update for instant feedback — re-applying here would double-increment.
        applyOptimistic: () => {
          /* Pattern A: caller (mutateWithDebounce) already applied */
        },
        restoreSnapshot: (prev) => {
          restoreReviewCaches(prev);
        },
        invalidate: async () => {
          if (lastInputRef.current) {
            const reviewId = lastInputRef.current.reviewId;
            try {
              if (utils.client?.reviews?.getEngagement) {
                const res = await utils.client.reviews.getEngagement.query({
                  reviewIds: [reviewId],
                });
                const engagement = res[reviewId];
                if (engagement) {
                  patchReviewInCaches(reviewId, (r) => ({
                    ...r,
                    engagement,
                  }));
                }
              }
            } catch {
              // ignore
            }
          }
        },
      },
    ),
    onSuccess: (_data, { reviewId, reaction }) => {
      if (reaction && ecfg.enableReviewEventsTracking) {
        track({
          reviewId,
          eventType: ReviewEventType.REACTION,
        });
      }
    },
  });
  const mutate = mutation.mutate;

  const applyOptimisticUpdate = useCallback(
    (variables: Parameters<typeof mutate>[0]) => {
      const { reviewId, reaction } = variables;
      lastInputRef.current = { reviewId };
      snapshotRef.current = patchReviewInCaches(reviewId, (r) =>
        withReaction(r, reaction),
      );
    },
    [],
  );

  const mutateWithDebounce = useDebouncedOptimisticMutate(
    mutate,
    applyOptimisticUpdate,
  );

  return {
    ...mutation,
    mutate: mutateWithDebounce,
  };
}
