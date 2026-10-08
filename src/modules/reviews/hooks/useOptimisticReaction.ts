import { useEdgeConfigs } from "@/common/hooks";
import { api, type RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { ReviewEventType } from "@/generated/prisma/enums";
import { useCallback, useMemo, useRef } from "react";

import { debounce } from "@/common/functions/debounce";
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
          await cancelReviewCaches(utils);
        },
        getSnapshot: () => snapshotRef.current,
        // Pattern A: the caller (mutateWithDebounce) already applied the optimistic
        // update for instant feedback — re-applying here would double-increment.
        applyOptimistic: () => {
          /* Pattern A: caller (mutateWithDebounce) already applied */
        },
        restoreSnapshot: (prev) => {
          restoreReviewCaches(utils, prev);
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
                  patchReviewInCaches(utils, reviewId, (r) => ({
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
      snapshotRef.current = patchReviewInCaches(utils, reviewId, (r) =>
        withReaction(r, reaction),
      );
    },
    [utils],
  );

  const debouncedMutate = useMemo(
    () =>
      debounce((variables: Parameters<typeof mutate>[0]) => {
        mutate(variables);
      }, 300),
    [mutate],
  );

  const mutateWithDebounce = useCallback(
    (variables: Parameters<typeof mutate>[0]) => {
      lastInputRef.current = { reviewId: variables.reviewId };
      applyOptimisticUpdate(variables); // immediate UI update
      debouncedMutate(variables); // debounced server mutation
    },
    [applyOptimisticUpdate, debouncedMutate],
  );

  return {
    ...mutation,
    mutate: mutateWithDebounce,
  };
}
